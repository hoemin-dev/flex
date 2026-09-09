import { useCallback, useEffect, useRef, useState } from "react";
import { resolveCurrentActor } from "../identity/currentActor";
import { mergeMessages, toggleReaction } from "../lib/messages";
import { connectRoomSocket, listRoomMessages, sendRoomMessage, type CreatedMessage } from "../services/roomSocket";
import type { Message } from "../types/chat";

export type SocketState = "idle" | "connecting" | "connected" | "reconnecting" | "error";
export function useRoomChat(roomId: string, onSent: (roomId: string, body: string) => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [socketState, setSocketState] = useState<SocketState>("idle");
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const generationRef = useRef(0);
  const pending = useRef<{ body: string; timer: number } | null>(null);
  const onSentRef = useRef(onSent);
  onSentRef.current = onSent;

  useEffect(() => {
    if (!roomId) return;
    const generation = ++generationRef.current;
    const controller = new AbortController();
    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let retryIndex = 0;
    let intentionalClose = false;
    const retryDelays = [1000, 2000, 5000];
    const current = () => generationRef.current === generation && !controller.signal.aborted;
    const clearPending = () => {
      if (pending.current) window.clearTimeout(pending.current.timer);
      pending.current = null;
      setIsSending(false);
    };
    setMessages([]);
    setError("");
    setHistoryState("loading");
    setSocketState("connecting");
    setIsSending(false);
    const merge = (incoming: CreatedMessage[]) => {
      if (current()) setMessages((value) => mergeMessages(value, incoming));
    };
    const connect = () => {
      if (!current()) return;
      try {
        socket = connectRoomSocket(roomId, (event) => {
          if (!current()) return;
          if (event.event === "message.created" && event.message.roomId === roomId) {
            merge([event.message]);
            if (event.message.senderId === resolveCurrentActor().id && pending.current?.body === event.message.body) {
              onSentRef.current(roomId, event.message.body);
              clearPending();
            }
          } else if (event.event === "error") {
            setError(event.error.message);
            clearPending();
          }
        });
      } catch {
        setSocketState("error");
        setError("실시간 연결을 시작하지 못했습니다. 다시 연결해 주세요.");
        return;
      }
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        if (!current()) return;
        retryIndex = 0;
        setSocketState("connected");
        setError("");
        setHistoryState("loading");
        listRoomMessages(roomId, controller.signal).then(({ messages: history }) => {
          if (!current()) return;
          merge(history);
          setHistoryState("ready");
        }).catch(() => {
          if (current()) { setHistoryState("error"); setError("최근 대화를 불러오지 못했습니다. 다시 연결해 주세요."); }
        });
      });
      socket.addEventListener("close", () => {
        if (intentionalClose || !current()) return;
        if (pending.current) setError("전송 확인이 중단되었습니다. 다시 연결한 후 대화를 확인해 주세요. 작성 내용은 보관했습니다.");
        clearPending();
        if (retryIndex >= retryDelays.length) { setSocketState("error"); return; }
        setSocketState("reconnecting");
        retryTimer = window.setTimeout(connect, retryDelays[retryIndex++]);
      });
      socket.addEventListener("error", () => { if (current()) setError("실시간 연결에 문제가 발생했습니다."); });
    };
    connect();
    return () => {
      intentionalClose = true;
      controller.abort();
      ++generationRef.current;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      clearPending();
      socket?.close(1000, "Room changed");
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [roomId, attempt]);

  const send = (body: string) => {
    if (!body.trim() || pending.current || socketState !== "connected" || !socketRef.current) return;
    setError("");
    setIsSending(true);
    pending.current = { body: body.trim(), timer: window.setTimeout(() => {
      pending.current = null;
      setIsSending(false);
      setError("전송 확인이 지연되고 있습니다. 중복 전송을 피하려면 대화를 먼저 확인해 주세요. 작성 내용은 보관했습니다.");
    }, 15000) };
    try { sendRoomMessage(socketRef.current, body.trim()); }
    catch (cause) {
      window.clearTimeout(pending.current.timer);
      pending.current = null;
      setIsSending(false);
      setError(cause instanceof Error ? cause.message : "메시지를 전송하지 못했습니다.");
    }
  };
  const react = useCallback((id: string, emoji: string) => setMessages((value) => toggleReaction(value, id, emoji, resolveCurrentActor().id)), []);
  return { messages, socketState, historyState, error, isSending, send, react, reconnect: () => setAttempt((value) => value + 1) };
}
