import { useLayoutEffect, useRef } from "react";
import { LoaderCircle, SendHorizontal } from "lucide-react";
import type { SocketState } from "../hooks/useRoomChat";

export function Composer({ roomName, draft, setDraft, canPost, socketState, isSending, send }: {
  roomName: string; draft: string; setDraft: (value: string) => void; canPost: boolean;
  socketState: SocketState; isSending: boolean; send: () => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const wasSending = useRef(false);
  useLayoutEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 160)}px`;
    }
  }, [draft, roomName]);
  useLayoutEffect(() => {
    if (wasSending.current && !isSending) textarea.current?.focus();
    wasSending.current = isSending;
  }, [isSending]);
  const connected = socketState === "connected";
  return <footer className="composer-wrap">
    <form className={`composer ${!canPost ? "disabled" : ""}`} onSubmit={(event) => { event.preventDefault(); if (canPost && connected && !isSending) send(); }}>
      <textarea ref={textarea} aria-label={`${roomName || "대화방"} 메시지 작성`} aria-describedby="composer-hint" value={draft} disabled={!canPost} readOnly={isSending}
        onChange={(event) => setDraft(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.keyCode !== 229) { event.preventDefault(); if (canPost && connected && !isSending) send(); } }}
        rows={1} placeholder={canPost ? `${roomName}에 메시지 남기기` : roomName ? "읽기 전용 대화방입니다" : "대화방을 선택해 주세요"} />
      <div className="composer-toolbar"><span>{isSending ? "전송 확인 중…" : !canPost ? "메시지를 작성할 수 없습니다" : !connected ? "연결 대기 · 작성 내용은 유지됩니다" : "메시지"}</span><button type="submit" className="send-button" disabled={!draft.trim() || !canPost || !connected || isSending} aria-label="메시지 보내기" title="메시지 보내기 (Enter)">{isSending ? <LoaderCircle className="spin" size={17} /> : <SendHorizontal size={17} />}</button></div>
    </form><div id="composer-hint" className="composer-hint"><span>이 창에서 방별로 작성 내용 보관</span><span><kbd>Enter</kbd> 전송 <span className="hint-dot">·</span> <kbd>Shift + Enter</kbd> 줄바꿈</span></div>
  </footer>;
}
