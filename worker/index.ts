import { resolveCurrentActor } from "./identity";
interface Env {
  DB: D1Database;
  ROOMS: DurableObjectNamespace;
  DEV_ALLOW_MOCK_IDENTITY?: string;
}

interface ConnectionAttachment {
  roomId: string;
  userId: string;
  connectedAt: string;
}

interface CreateMessagePayload {
  type: "message.create";
  body: string;
  messageType?: "text" | "system" | "notice" | "live";
  replyToMessageId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const ROOM_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,62}[A-Za-z0-9])?$/;
const MESSAGE_TYPES = new Set(["text", "system", "notice", "live"]);

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Flex-Dev-User",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
}

async function authorizeRoomAccess(userId: string, roomId: string, env: Env): Promise<boolean> {
  // Fixture access assignments, not user subscriptions. Future EMP organization policy boundary.
  const membership = await env.DB.prepare(
    "SELECT 1 AS allowed FROM room_members WHERE room_id = ? AND user_id = ?"
  ).bind(roomId, userId).first<{ allowed: number }>();
  return membership?.allowed === 1;
}

function parseRoomResourcePath(pathname: string, resource: "messages" | "read"): string | null {
  const match = pathname.match(new RegExp(`^/rooms/([^/]+)/${resource}$`));
  if (!match) return null;
  try {
    const roomId = decodeURIComponent(match[1]);
    return ROOM_ID_PATTERN.test(roomId) ? roomId : null;
  } catch { return null; }
}

function parseMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

function parseRoomWebSocketPath(pathname: string): string | null {
  const match = pathname.match(/^\/rooms\/([^/]+)\/ws$/);
  if (!match) return null;
  try {
    const roomId = decodeURIComponent(match[1]);
    return ROOM_ID_PATTERN.test(roomId) ? roomId : null;
  } catch {
    return null;
  }
}

export const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: json(null).headers });

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "flextrans-api-d" });
    }

    if (request.method === "GET" && url.pathname === "/health/db") {
      try {
        const result = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
        return json({ ok: result?.ok === 1, service: "flextrans-api-d", database: "reachable" });
      } catch {
        return json({ ok: false, service: "flextrans-api-d", database: "unreachable" }, 503);
      }
    }

    if (request.method === "GET" && url.pathname === "/rooms") {
      const userId = resolveCurrentActor(request, env);
      if (!userId) return json({ ok: false, error: { code: "UNAUTHORIZED", message: "A valid development identity is required." } }, 401);
      const result = await env.DB.prepare(
        `SELECT rooms.id, rooms.name, 'GROUP' AS type,
            (SELECT json_group_array(user_id) FROM room_members m WHERE m.room_id = rooms.id) AS members,
            (SELECT body FROM messages m WHERE m.room_id = rooms.id ORDER BY sequence DESC LIMIT 1) AS lastMessage,
            COALESCE((SELECT created_at FROM messages m WHERE m.room_id = rooms.id ORDER BY sequence DESC LIMIT 1), rooms.created_at) AS lastActivityAt,
            (SELECT COUNT(*) FROM messages m WHERE m.room_id = rooms.id AND m.sender_id != room_members.user_id
              AND m.sequence > COALESCE((SELECT seen.sequence FROM read_cursors c JOIN messages seen ON seen.id = c.last_read_message_id
                WHERE c.room_id = rooms.id AND c.user_id = room_members.user_id), 0)) AS unreadCount
           FROM rooms
           JOIN room_members ON room_members.room_id = rooms.id
          WHERE room_members.user_id = ?
          ORDER BY lastActivityAt DESC, rooms.id ASC`
      ).bind(userId).all<{ id: string; name: string; members?: string }>();
      return json({ rooms: result.results.map(({ members, ...room }) => ({ ...room, ...(members ? { members: JSON.parse(members) } : {}) })) });
    }

    if (request.method === "POST" && /^\/rooms\/.+\/read$/.test(url.pathname)) {
      const roomId = parseRoomResourcePath(url.pathname, "read");
      if (!roomId) return json({ error: "Invalid room" }, 400);
      const userId = resolveCurrentActor(request, env);
      if (!userId) return json({ error: "Unauthorized" }, 401);
      if (!(await authorizeRoomAccess(userId, roomId, env))) return json({ error: "Forbidden" }, 403);
      let messageId: unknown;
      try { messageId = (await request.json() as { messageId?: unknown }).messageId; }
      catch { return json({ error: "Invalid JSON" }, 400); }
      if (typeof messageId !== "string") return json({ error: "messageId required" }, 400);
      const message = await env.DB.prepare("SELECT sequence FROM messages WHERE room_id = ? AND id = ?").bind(roomId, messageId).first<{ sequence: number }>();
      if (!message) return json({ error: "Message not in room" }, 400);
      await env.DB.prepare(`INSERT INTO read_cursors (room_id, user_id, last_read_message_id, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(room_id, user_id) DO UPDATE SET
        last_read_message_id = excluded.last_read_message_id, updated_at = excluded.updated_at
        WHERE COALESCE((SELECT sequence FROM messages WHERE id = read_cursors.last_read_message_id), 0)
          < (SELECT sequence FROM messages WHERE id = excluded.last_read_message_id)`)
        .bind(roomId, userId, messageId, new Date().toISOString()).run();
      return json({ ok: true });
    }

    if (request.method === "GET" && /^\/rooms\/.+\/messages$/.test(url.pathname)) {
      const roomId = parseRoomResourcePath(url.pathname, "messages");
      if (!roomId) return json({ ok: false, error: { code: "INVALID_ROOM_ID", message: "The roomId is invalid." } }, 400);
      const userId = resolveCurrentActor(request, env);
      if (!userId) return json({ ok: false, error: { code: "UNAUTHORIZED", message: "A valid development identity is required." } }, 401);
      if (!(await authorizeRoomAccess(userId, roomId, env))) return json({ ok: false, error: { code: "FORBIDDEN", message: "Room access denied." } }, 403);
      const result = await env.DB.prepare(
        `SELECT * FROM (
           SELECT sequence, id, room_id, sender_id, type, body, reply_to_message_id,
                  metadata_json, created_at, edited_at
             FROM messages WHERE room_id = ? ORDER BY sequence DESC LIMIT 100
         ) ORDER BY sequence ASC`
      ).bind(roomId).all<{
        sequence: number; id: string; room_id: string; sender_id: string; type: CreateMessagePayload["messageType"];
        body: string; reply_to_message_id: string | null; metadata_json: string | null; created_at: string; edited_at: string | null;
      }>();
      return json({ messages: result.results.map((row) => ({
        id: row.id, sequence: row.sequence, roomId: row.room_id, senderId: row.sender_id,
        type: row.type, body: row.body, replyToMessageId: row.reply_to_message_id,
        metadata: parseMetadata(row.metadata_json), createdAt: row.created_at, editedAt: row.edited_at
      })) });
    }

    if (request.method === "GET" && /^\/rooms\/.+\/ws$/.test(url.pathname)) {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return json({ ok: false, error: { code: "WEBSOCKET_UPGRADE_REQUIRED", message: "Expected a WebSocket upgrade." } }, 426);
      }
      const roomId = parseRoomWebSocketPath(url.pathname);
      if (!roomId) {
        return json({ ok: false, error: { code: "INVALID_ROOM_ID", message: "The roomId is invalid." } }, 400);
      }
      const userId = resolveCurrentActor(request, env);
      if (!userId) {
        return json({ ok: false, error: { code: "UNAUTHORIZED", message: "A valid development identity is required." } }, 401);
      }
      if (!(await authorizeRoomAccess(userId, roomId, env))) {
        return json({ ok: false, error: { code: "FORBIDDEN", message: "Room access denied." } }, 403);
      }

      const headers = new Headers(request.headers);
      headers.set("X-Flex-Room-Id", roomId);
      headers.set("X-Flex-User-Id", userId);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
      return stub.fetch(new Request(request, { headers }));
    }

    return json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found." } }, 404);
  }
};

export default worker;

export class FlexRoomDO {
  constructor(private readonly ctx: DurableObjectState, private readonly env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json({ ok: false, error: { code: "WEBSOCKET_UPGRADE_REQUIRED", message: "Expected a WebSocket upgrade." } }, 426);
    }
    const roomId = request.headers.get("X-Flex-Room-Id");
    const userId = request.headers.get("X-Flex-User-Id");
    if (!roomId || !userId || !ROOM_ID_PATTERN.test(roomId)) {
      return json({ ok: false, error: { code: "INVALID_CONNECTION", message: "Missing trusted connection metadata." } }, 400);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ roomId, userId, connectedAt: new Date().toISOString() } satisfies ConnectionAttachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let payload: CreateMessagePayload;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
      payload = JSON.parse(text) as CreateMessagePayload;
    } catch {
      this.sendError(ws, "PAYLOAD_PARSE_ERROR", "Payload must be valid JSON.");
      return;
    }

    const validationError = this.validateMessage(payload);
    if (validationError) {
      this.sendError(ws, "MESSAGE_VALIDATION_FAILED", validationError);
      return;
    }

    const attachment = ws.deserializeAttachment() as ConnectionAttachment | null;
    if (!attachment?.roomId || !attachment.userId) {
      this.sendError(ws, "CONNECTION_STATE_MISSING", "Connection metadata is unavailable.");
      return;
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const messageType = payload.messageType ?? "text";
    const metadataJson = payload.metadata == null ? null : JSON.stringify(payload.metadata);

    try {
      const saved = await this.env.DB.prepare(
        `INSERT INTO messages
          (id, room_id, sender_id, type, body, reply_to_message_id, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING sequence`
      ).bind(
        id,
        attachment.roomId,
        attachment.userId,
        messageType,
        payload.body.trim(),
        payload.replyToMessageId ?? null,
        metadataJson,
        createdAt
      ).first<{ sequence: number }>();

      if (!saved) throw new Error("D1 insert did not return a sequence");

      const event = JSON.stringify({
        event: "message.created",
        message: {
          id,
          sequence: saved.sequence,
          roomId: attachment.roomId,
          senderId: attachment.userId,
          type: messageType,
          body: payload.body.trim(),
          replyToMessageId: payload.replyToMessageId ?? null,
          metadata: payload.metadata ?? null,
          createdAt,
          editedAt: null
        }
      });

      for (const socket of this.ctx.getWebSockets()) {
        const peer = socket.deserializeAttachment() as ConnectionAttachment | null;
        if (peer?.roomId === attachment.roomId) {
          try { socket.send(event); } catch { /* stale sockets are closed by the runtime */ }
        }
      }
    } catch {
      this.sendError(ws, "D1_WRITE_FAILED", "The message was not saved. Nothing was broadcast.");
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    try { ws.close(code, reason); } catch { /* already closed */ }
  }

  webSocketError(ws: WebSocket): void {
    try { ws.close(1011, "Internal WebSocket error"); } catch { /* already closed */ }
  }

  private validateMessage(payload: CreateMessagePayload): string | null {
    if (!payload || payload.type !== "message.create") return "Unsupported event type.";
    if (typeof payload.body !== "string" || payload.body.trim().length === 0 || payload.body.trim().length > 4000) return "body must contain 1 to 4000 characters.";
    if (payload.messageType !== undefined && !MESSAGE_TYPES.has(payload.messageType)) return "messageType is invalid.";
    if (payload.replyToMessageId != null && (typeof payload.replyToMessageId !== "string" || payload.replyToMessageId.length > 128)) return "replyToMessageId is invalid.";
    if (payload.metadata != null && (typeof payload.metadata !== "object" || Array.isArray(payload.metadata) || JSON.stringify(payload.metadata).length > 8000)) return "metadata is invalid or too large.";
    return null;
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    try { ws.send(JSON.stringify({ event: "error", error: { code, message } })); } catch { /* socket already unavailable */ }
  }
}
