import { backendConfig } from "../config/backend";
import { applyCurrentActorToSocketUrl, currentActorHeaders } from "../identity/currentActor";

export interface CreatedMessage {
  id: string;
  sequence: number;
  roomId: string;
  senderId: string;
  type: "text" | "system" | "notice" | "live";
  body: string;
  replyToMessageId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  editedAt: string | null;
}

export type RoomSocketEvent =
  | { event: "message.created"; message: CreatedMessage }
  | { event: "error"; error: { code: string; message: string } };

export interface ApiRoom { id: string; name: string; type?: "GROUP" | "DIRECT" | "SYSTEM"; members?: string[]; lastMessage?: string | null; lastActivityAt?: string; unreadCount?: number }
export interface RoomsResponse { rooms: ApiRoom[] }
export interface MessagesResponse { messages: CreatedMessage[] }

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${backendConfig.apiUrl}${path}`, {
    headers: currentActorHeaders(),
    signal
  });
  if (!response.ok) throw new Error(`Flex backend request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function listRooms(signal?: AbortSignal): Promise<RoomsResponse> {
  return getJson<RoomsResponse>("/rooms", signal);
}

export function listRoomMessages(roomId: string, signal?: AbortSignal): Promise<MessagesResponse> {
  return getJson<MessagesResponse>(`/rooms/${encodeURIComponent(roomId)}/messages`, signal);
}

export function connectRoomSocket(roomId: string, onEvent: (event: RoomSocketEvent) => void): WebSocket {
  const url = new URL(`/rooms/${encodeURIComponent(roomId)}/ws`, backendConfig.apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  applyCurrentActorToSocketUrl(url);
  const socket = new WebSocket(url);
  socket.addEventListener("message", (message) => {
    try { onEvent(JSON.parse(String(message.data)) as RoomSocketEvent); } catch { /* ignore malformed server events */ }
  });
  return socket;
}

export function sendRoomMessage(socket: WebSocket, body: string): void {
  if (socket.readyState !== WebSocket.OPEN) throw new Error("Room socket is not connected.");
  socket.send(JSON.stringify({ type: "message.create", messageType: "text", body }));
}

export async function markRoomRead(roomId: string, messageId: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${backendConfig.apiUrl}/rooms/${encodeURIComponent(roomId)}/read`, {
    method: "POST", headers: { ...currentActorHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }), signal
  });
  if (!response.ok) throw new Error("읽음 상태를 저장하지 못했습니다.");
}
