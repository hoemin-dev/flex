import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Composer } from "./components/Composer";
import { MessageTimeline } from "./components/MessageTimeline";
import { useRoomChat } from "./hooks/useRoomChat";
import { resolveCurrentActor, selectDevActor } from "./identity/currentActor";
import { DEV_ACTORS } from "./config/devActors";
import { listRooms, markRoomRead, type ApiRoom } from "./services/roomSocket";
import "./standalone.css";

export const FLEX_WIDTH = 360;
const labels = { idle: "연결 대기", connecting: "연결 중", connected: "실시간 연결됨", reconnecting: "다시 연결 중", error: "연결 끊김" };
const people = DEV_ACTORS.map(actor => ({ id: actor.actorId, name: actor.displayName, title: actor.department, departmentId: actor.department, presence: "online" as const, avatarColor: "#718566" }));

export function StandaloneFlex() {
  const actor = resolveCurrentActor();
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [activeId, setActiveId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [readError, setReadError] = useState("");
  const [visible, setVisible] = useState(document.visibilityState === "visible");
  const chat = useRoomChat(activeId, (id, body) => {
    setDrafts(current => current[id]?.trim() === body ? { ...current, [id]: "" } : current);
  });
  const active = rooms.find(room => room.id === activeId);
  useEffect(() => {
    const changed = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    const update = async () => {
      try {
        const response = await listRooms(controller.signal);
        if (!controller.signal.aborted) { setRooms(response.rooms); setError(""); }
      } catch { if (!controller.signal.aborted) setError("방 목록을 불러오지 못했습니다."); }
      finally {
        if (!controller.signal.aborted) { setLoading(false); timer = window.setTimeout(update, 2000); }
      }
    };
    void update();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [refresh, activeId, visible]);
  const last = chat.messages.filter(message => message.roomId === activeId).at(-1);
  useEffect(() => {
    setReadError("");
    if (!activeId || !last || !visible || chat.historyState !== "ready") return;
    const controller = new AbortController();
    let timer: number;
    const save = async () => {
      try {
        // Let an already-started read write finish when navigating back.
        await markRoomRead(activeId, last.id);
        if (!controller.signal.aborted) {
          setReadError("");
          setRooms(current => current.map(room => room.id === activeId ? { ...room, unreadCount: 0 } : room));
        }
      } catch {
        if (!controller.signal.aborted) { setReadError("읽음 저장 재시도 중"); timer = window.setTimeout(save, 2000); }
      }
    };
    void save();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [activeId, last?.id, visible, chat.historyState]);
  const totalUnread = rooms.reduce((sum, room) => sum + (room.id === activeId && visible ? 0 : room.unreadCount ?? 0), 0);
  return <main className="standalone" style={{ maxWidth: FLEX_WIDTH }} aria-label="Flex 채팅">
    {!activeId ? <>
      <header className="standalone-top"><h1>Flex</h1><span aria-label={`안 읽은 메시지 ${totalUnread}개`}>{totalUnread > 0 ? `${totalUnread}개 안 읽음` : "대화방"}</span></header>
      <div className="actor-profile"><b>{people.find(person => person.id === actor.id)?.name ?? actor.id}</b><small>{people.find(person => person.id === actor.id)?.title}</small>
        {import.meta.env.DEV && <label>DEV <select aria-label="개발 사용자" value={actor.id} onChange={event => selectDevActor(event.target.value)}>{DEV_ACTORS.map(person => <option key={person.actorId} value={person.actorId}>{person.displayName}</option>)}</select></label>}
      </div>
      <input className="standalone-search" aria-label="방 검색" placeholder="대화방 검색" value={query} onChange={event => setQuery(event.target.value)} />
      {error && <div className="connection-banner" role="status">{error}<button onClick={() => setRefresh(value => value + 1)}>다시 시도</button></div>}
      <nav className="standalone-rooms" aria-label="대화방">
        {loading && <p role="status">대화방을 불러오는 중…</p>}
        {!loading && !rooms.filter(room => room.name.includes(query)).length && <p>표시할 대화방이 없습니다.</p>}
        {rooms.filter(room => room.name.includes(query)).map(room => <button className="standalone-room" key={room.id} aria-label={room.name} onClick={() => setActiveId(room.id)}>
          <span className="room-summary"><b title={room.name}>{room.name}</b><small>{room.lastMessage || "첫 대화를 시작해 보세요"}</small></span>
          <span className="room-aside"><time>{room.lastActivityAt ? new Date(room.lastActivityAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}</time>{!!room.unreadCount && <span className="unread-count" aria-label={`${room.unreadCount}개 안 읽음`}>{room.unreadCount > 99 ? "99+" : room.unreadCount}</span>}</span>
        </button>)}
      </nav>
    </> : <section className="chat">
      <header className="chat-header"><button className="icon-button" aria-label="방 목록으로 돌아가기" onClick={() => setActiveId("")}><ArrowLeft size={20} /></button><div className="standalone-heading"><h1 title={active?.name}>{active?.name}</h1><span className="connection-status" role="status">{labels[chat.socketState]} · {active?.members?.length ?? 0}명</span></div><button className="icon-button" aria-label="다시 연결" onClick={chat.reconnect}><RefreshCw size={16} /></button></header>
      {(chat.error || readError) && <div className="connection-banner" role="status">{chat.error || readError}</div>}
      <MessageTimeline key={activeId} messages={chat.messages.filter(message => message.roomId === activeId)} people={people} roomName={active?.name ?? ""} loading={chat.historyState === "loading"} unavailable={chat.historyState === "error"} react={chat.react} />
      <Composer roomName={active?.name ?? ""} draft={drafts[activeId] ?? ""} setDraft={draft => setDrafts(current => ({ ...current, [activeId]: draft }))} canPost={!!active} socketState={chat.socketState} isSending={chat.isSending} send={() => chat.send(drafts[activeId] ?? "")} />
    </section>}
  </main>;
}
