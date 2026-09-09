import { describe, expect, it, vi } from "vitest";
import worker, { FlexRoomDO } from "./index";

function socket(roomId = "rnd", userId = "me") {
  return {
    deserializeAttachment: () => ({ roomId, userId, connectedAt: "2026-08-24T00:00:00.000Z" }),
    send: vi.fn(),
    close: vi.fn()
  } as unknown as WebSocket & { send: ReturnType<typeof vi.fn> };
}

function createRoom(options: { writeFails?: boolean } = {}) {
  const sender = socket();
  const peer = socket("rnd", "kim");
  const outsider = socket("sales", "lee");
  const first = options.writeFails
    ? vi.fn().mockRejectedValue(new Error("D1 unavailable"))
    : vi.fn().mockResolvedValue({ sequence: 42 });
  const bind = vi.fn().mockReturnValue({ first });
  const prepare = vi.fn().mockReturnValue({ bind });
  const ctx = { getWebSockets: () => [sender, peer, outsider] };
  const room = new FlexRoomDO(ctx as unknown as DurableObjectState, { DB: { prepare } } as unknown as ConstructorParameters<typeof FlexRoomDO>[1]);
  return { room, sender, peer, outsider, prepare };
}

describe("FlexRoomDO message persistence", () => {
  it("broadcasts one canonical event to sockets in the same room after D1 succeeds", async () => {
    const { room, sender, peer, outsider, prepare } = createRoom();

    await room.webSocketMessage(sender, JSON.stringify({ type: "message.create", body: " hello " }));

    expect(prepare).toHaveBeenCalledOnce();
    expect(sender.send).toHaveBeenCalledOnce();
    expect(peer.send).toHaveBeenCalledWith(sender.send.mock.calls[0][0]);
    expect(outsider.send).not.toHaveBeenCalled();
    const event = JSON.parse(sender.send.mock.calls[0][0] as string);
    expect(event).toMatchObject({ event: "message.created", message: { sequence: 42, roomId: "rnd", senderId: "me", body: "hello" } });
  });

  it("sends only an error to the sender and does not broadcast when D1 fails", async () => {
    const { room, sender, peer } = createRoom({ writeFails: true });

    await room.webSocketMessage(sender, JSON.stringify({ type: "message.create", body: "hello" }));

    expect(sender.send).toHaveBeenCalledOnce();
    expect(JSON.parse(sender.send.mock.calls[0][0] as string)).toMatchObject({ event: "error", error: { code: "D1_WRITE_FAILED" } });
    expect(peer.send).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON without touching D1", async () => {
    const { room, sender, prepare } = createRoom();

    await room.webSocketMessage(sender, "{");

    expect(prepare).not.toHaveBeenCalled();
    expect(JSON.parse(sender.send.mock.calls[0][0] as string)).toMatchObject({ error: { code: "PAYLOAD_PARSE_ERROR" } });
  });
});

describe("room HTTP API", () => {
  it("lists only rooms returned for the resolved development user", async () => {
    const all = vi.fn().mockResolvedValue({ results: [{ id: "rnd", name: "연구개발부" }] });
    const bind = vi.fn().mockReturnValue({ all });
    const prepare = vi.fn().mockReturnValue({ bind });
    const response = await worker.fetch(new Request("https://example.test/rooms"), { DB: { prepare }, DEV_ALLOW_MOCK_IDENTITY: "true" } as unknown as Parameters<typeof worker.fetch>[1]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rooms: [{ id: "rnd", name: "연구개발부" }] });
    expect(bind).toHaveBeenCalledWith("me");
  });

  it("returns recent history in authoritative sequence order", async () => {
    const first = vi.fn().mockResolvedValue({ allowed: 1 });
    const all = vi.fn().mockResolvedValue({ results: [
      { sequence: 4, id: "m4", room_id: "rnd", sender_id: "me", type: "text", body: "four", reply_to_message_id: null, metadata_json: null, created_at: "2026-08-24T00:00:00.000Z", edited_at: null },
      { sequence: 5, id: "m5", room_id: "rnd", sender_id: "kim", type: "notice", body: "five", reply_to_message_id: null, metadata_json: "{\"label\":\"공지\"}", created_at: "2026-08-24T00:01:00.000Z", edited_at: null }
    ] });
    const prepare = vi.fn((sql: string) => sql.includes("room_members WHERE")
      ? { bind: vi.fn().mockReturnValue({ first }) }
      : { bind: vi.fn().mockReturnValue({ all }) });
    const response = await worker.fetch(new Request("https://example.test/rooms/rnd/messages"), { DB: { prepare }, DEV_ALLOW_MOCK_IDENTITY: "true" } as unknown as Parameters<typeof worker.fetch>[1]);
    const body = await response.json() as { messages: Array<{ sequence: number }> };

    expect(response.status).toBe(200);
    expect(body.messages.map((message) => message.sequence)).toEqual([4, 5]);
    expect(prepare.mock.calls[1][0]).toContain("ORDER BY sequence ASC");
  });

  it("rejects history access when the development fixture has no membership", async () => {
    const first = vi.fn().mockResolvedValue(null);
    const prepare = vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first }) });
    const response = await worker.fetch(new Request("https://example.test/rooms/private/messages"), { DB: { prepare }, DEV_ALLOW_MOCK_IDENTITY: "true" } as unknown as Parameters<typeof worker.fetch>[1]);

    expect(response.status).toBe(403);
  });
});
