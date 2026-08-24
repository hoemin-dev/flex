import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronLeft, Hash, LockKeyhole, MessageCircleMore, MoreHorizontal, Search, SendHorizontal, SmilePlus, Users, X } from "lucide-react";
import { mockRooms } from "./data/mockRooms";
import { flexHost } from "./host/dock";
import { departmentNames, MockOrganizationProvider } from "./providers/mockOrganization";
import type { Message, Person, Room } from "./types/chat";

const organizationProvider = new MockOrganizationProvider();
const CURRENT_USER_ID = "me";

function Avatar({ person, size = 30 }: { person?: Person; size?: number }) {
  if (!person) return null;
  return <span className="avatar" style={{ width: size, height: size, background: person.avatarColor }} aria-label={person.name}>{person.name.slice(0, 1)}<i className={`presence ${person.presence}`} /></span>;
}

function RichText({ children }: { children: string }) {
  const parts = children.split(/(@[^\s]+)/g);
  return <>{parts.map((part, index) => part.startsWith("@") ? <mark key={index}>{part}</mark> : part)}</>;
}

function MessageCard({ message }: { message: Message }) {
  const live = message.kind === "live";
  return <article className={`event-card ${live ? "live" : "notice"}`}>
    <div className="event-icon">{live ? <span className="live-pulse" /> : <Bell size={15} />}</div>
    <div><span className="event-label">{message.metadata?.label}</span><h4>{message.content}</h4><p>{message.metadata?.detail}</p><time>{message.createdAt}</time></div>
  </article>;
}

function ChatMessage({ message, people, onReact }: { message: Message; people: Person[]; onReact: (messageId: string) => void }) {
  const person = people.find((item) => item.id === message.authorId);
  if (message.kind !== "text") return <MessageCard message={message} />;
  return <article className={`message ${message.authorId === CURRENT_USER_ID ? "mine" : ""}`}>
    <Avatar person={person} size={32} />
    <div className="message-body"><div className="message-meta"><b>{person?.name}</b><span>{person?.title}</span><time>{message.createdAt}</time></div>
      <p><RichText>{message.content}</RichText></p>
      <div className="reaction-row">{message.reactions?.map((reaction) => <button key={reaction.emoji} className={reaction.personIds.includes(CURRENT_USER_ID) ? "selected" : ""} onClick={() => onReact(message.id)}>{reaction.emoji} <span>{reaction.personIds.length}</span></button>)}<button className="add-reaction" onClick={() => onReact(message.id)} aria-label="반응 추가"><SmilePlus size={14} /></button></div>
    </div>
  </article>;
}

export function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [activeRoomId, setActiveRoomId] = useState("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [membersOpen, setMembersOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const members = people.filter((person) => activeRoom.memberIds.includes(person.id));
  const filteredRooms = useMemo(() => rooms.filter((room) => room.name.toLowerCase().includes(query.toLowerCase())), [rooms, query]);

  useEffect(() => { organizationProvider.listPeople().then(setPeople); }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [activeRoom.messages.length, activeRoomId]);

  const selectRoom = (id: string) => {
    setActiveRoomId(id);
    setRooms((current) => current.map((room) => room.id === id ? { ...room, unreadCount: 0 } : room));
  };

  const sendMessage = () => {
    const content = draft.trim();
    if (!content || !activeRoom.canPost) return;
    const newMessage: Message = { id: crypto.randomUUID(), roomId: activeRoom.id, authorId: CURRENT_USER_ID, kind: "text", content, createdAt: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()) };
    setRooms((current) => current.map((room) => room.id === activeRoom.id ? { ...room, messages: [...room.messages, newMessage] } : room));
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "38px";
  };

  const react = (messageId: string) => setRooms((current) => current.map((room) => room.id !== activeRoom.id ? room : { ...room, messages: room.messages.map((message) => {
    if (message.id !== messageId) return message;
    const reactions = message.reactions?.length ? message.reactions.map((reaction, index) => index ? reaction : { ...reaction, personIds: reaction.personIds.includes(CURRENT_USER_ID) ? reaction.personIds.filter((id) => id !== CURRENT_USER_ID) : [...reaction.personIds, CURRENT_USER_ID] }) : [{ emoji: "👍", personIds: [CURRENT_USER_ID] }];
    return { ...message, reactions };
  }) }));

  const resizeComposer = (value: string) => {
    setDraft(value);
    const element = textareaRef.current;
    if (element) { element.style.height = "38px"; element.style.height = `${Math.min(element.scrollHeight, 112)}px`; }
  };

  return <main className="flex-shell">
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand"><span className="brand-mark"><MessageCircleMore size={16} /></span><b>Flex</b><span>MONAS</span></div>
      <div className="window-actions"><button aria-label="Flex 접기" title="MonaHub 옆으로 접기" onClick={() => flexHost.collapse()}><ChevronLeft size={18} /></button><button aria-label="닫기" onClick={() => flexHost.collapse()}><X size={17} /></button></div>
    </header>

    <section className="directory">
      <div className="rooms-pane">
        <div className="section-heading"><div><span>ROOMS</span><strong>{rooms.length}</strong></div><button aria-label="Room 메뉴"><MoreHorizontal size={17} /></button></div>
        <label className="search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Room 검색" /></label>
        <nav className="room-list">{filteredRooms.map((room) => <button key={room.id} className={room.id === activeRoom.id ? "active" : ""} onClick={() => selectRoom(room.id)}>
          <span className="room-symbol"><Hash size={15} /></span><span className="room-copy"><b>{room.name}</b><small>{room.messages.at(-1)?.content ?? "아직 메시지가 없습니다"}</small></span>{room.unreadCount > 0 && <i>{room.unreadCount}</i>}
        </button>)}</nav>
      </div>

      <aside className={`members-pane ${membersOpen ? "" : "closed"}`}>
        <div className="section-heading"><div><span>MEMBERS</span><strong>{members.length}</strong></div><button onClick={() => setMembersOpen(false)} aria-label="참여자 목록 닫기"><ChevronLeft size={17} /></button></div>
        <div className="member-list">{members.map((person) => <div className="member" key={person.id}><Avatar person={person} /><span><b>{person.name}</b><small>{departmentNames[person.departmentId]} · {person.title}</small></span></div>)}</div>
      </aside>
      {!membersOpen && <button className="open-members" onClick={() => setMembersOpen(true)} aria-label="참여자 목록 열기"><Users size={17} /></button>}
    </section>

    <section className="chat">
      <header className="chat-header"><div><span className="chat-hash"><Hash size={16} /></span><span><b>{activeRoom.name}</b><small>{members.length}명 참여</small></span></div><div className="chat-actions">{!activeRoom.canPost && <span className="read-only"><LockKeyhole size={12} /> 읽기 전용</span>}<button onClick={() => setMembersOpen((value) => !value)} aria-label="참여자"><Users size={17} /></button><button aria-label="더보기"><MoreHorizontal size={18} /></button></div></header>
      <div className="message-list" ref={listRef}><div className="day-divider"><span>오늘</span></div>{activeRoom.messages.length ? activeRoom.messages.map((message) => <ChatMessage key={message.id} message={message} people={people} onReact={react} />) : <div className="empty-state"><MessageCircleMore /><b>새로운 대화를 시작하세요</b><span>{activeRoom.name}의 첫 메시지를 남겨보세요.</span></div>}</div>
      <footer className="composer-wrap"><div className={`composer ${!activeRoom.canPost ? "disabled" : ""}`}><textarea ref={textareaRef} value={draft} disabled={!activeRoom.canPost} onChange={(event) => resizeComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={1} placeholder={activeRoom.canPost ? `${activeRoom.name}에 메시지 보내기` : "이 Room에서는 메시지를 작성할 수 없습니다"} /><button className="send" disabled={!draft.trim() || !activeRoom.canPost} onClick={sendMessage} aria-label="메시지 보내기"><SendHorizontal size={17} /></button></div><span className="composer-hint">Enter로 전송 · Shift+Enter로 줄바꿈</span></footer>
    </section>
  </main>;
}
