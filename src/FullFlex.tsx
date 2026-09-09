import { useEffect, useState } from "react";
import { AlertCircle, ChevronLeft, Hash, Menu, MessageCircleMore, RefreshCw, Users, X } from "lucide-react";
import { Composer } from "./components/Composer";
import { MembersPanel } from "./components/MembersPanel";
import { MessageTimeline } from "./components/MessageTimeline";
import { PanelDialog } from "./components/PanelDialog";
import { RoomNavigation } from "./components/RoomNavigation";
import { devRoomMemberIds } from "./config/devIdentity";
import { resolveCurrentActor } from "./identity/currentActor";
import { flexHost } from "./host/dock";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useRoomChat } from "./hooks/useRoomChat";
import { MockOrganizationProvider } from "./providers/mockOrganization";
import { listRooms } from "./services/roomSocket";
import type { Person, Room } from "./types/chat";
export { mergeMessages } from "./lib/messages";

const organizationProvider = new MockOrganizationProvider();
const connectionLabels = { idle: "연결 대기", connecting: "연결 중", connected: "실시간 연결됨", reconnecting: "다시 연결 중", error: "연결 끊김" };

export function FullFlex() {
  const [people, setPeople] = useState<Person[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [roomAttempt, setRoomAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [membersOpen, setMembersOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const compact = useMediaQuery("(max-width: 699px)");
  const wide = useMediaQuery("(min-width: 1120px)");
  const activeRoom = rooms.find((room) => room.id === activeRoomId);
  const members = people.filter((person) => activeRoom?.memberIds.includes(person.id));
  const chat = useRoomChat(activeRoomId, (roomId, body) => {
    setDrafts((value) => value[roomId]?.trim() === body ? { ...value, [roomId]: "" } : value);
  });
  useEffect(() => {
    const controller = new AbortController();
    setRoomsLoading(true);
    setRoomsError("");
    organizationProvider.listPeople().then((value) => { if (!controller.signal.aborted) setPeople(value); });
    listRooms(controller.signal).then(({ rooms: apiRooms }) => {
      if (controller.signal.aborted) return;
      const next: Room[] = apiRooms.map((room) => ({ ...room, memberIds: devRoomMemberIds[room.id] ?? [], messages: [], unreadCount: 0, canPost: true }));
      setRooms(next);
      setActiveRoomId((current) => next.some((room) => room.id === current) ? current : (next[0]?.id ?? ""));
    }).catch(() => { if (!controller.signal.aborted) setRoomsError("대화방 목록에 연결할 수 없습니다."); })
      .finally(() => { if (!controller.signal.aborted) setRoomsLoading(false); });
    return () => controller.abort();
  }, [roomAttempt]);
  useEffect(() => { if (!compact) setNavigationOpen(false); }, [compact]);

  const selectRoom = (id: string) => { setActiveRoomId(id); setNavigationOpen(false); setMembersOpen(false); };
  const navigation = <RoomNavigation rooms={rooms} activeId={activeRoomId} query={query} setQuery={setQuery} onSelect={selectRoom}
    person={people.find((person) => person.id === resolveCurrentActor().id)} loading={roomsLoading} error={roomsError} retry={() => setRoomAttempt((value) => value + 1)} close={() => setNavigationOpen(false)} />;
  const membersPanel = <MembersPanel members={members} close={() => setMembersOpen(false)} />;
  const connectionProblem = chat.socketState === "error" || chat.socketState === "reconnecting";
  return <main className="flex-shell">
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region><span className="brand-mark"><MessageCircleMore size={16} /></span><b>Flex</b><span className="brand-divider" /><span>MONA-HUB</span></div>
      <span className="titlebar-caption" data-tauri-drag-region>팀을 잇는 대화</span>
      <div className="window-actions"><button aria-label="Flex 접기" title="Mona-HUB 옆으로 접기" onClick={() => flexHost.collapse()}><ChevronLeft size={17} /></button><button aria-label="Flex 창 닫기" title="Flex 접기" onClick={() => flexHost.collapse()}><X size={17} /></button></div>
    </header>
    <div className={`workspace ${membersOpen && wide ? "with-members" : ""}`}>
      {!compact && <aside className="navigation-slot">{navigation}</aside>}
      <section className="chat" aria-label="Flex 대화">
        <header className="chat-header"><div className="room-heading">{compact && <button className="icon-button nav-toggle" aria-label="방 목록 및 검색 열기" aria-haspopup="dialog" aria-expanded={navigationOpen} onClick={() => { setMembersOpen(false); setNavigationOpen(true); }}><Menu size={20} /></button>}<span className="chat-hash"><Hash size={21} /></span><div><h1>{activeRoom?.name ?? "Flex"}</h1><span className={`connection-status ${chat.socketState}`} role="status"><i />{connectionLabels[chat.socketState]}</span></div></div>
          <button className={`members-toggle ${membersOpen ? "active" : ""}`} disabled={!activeRoom} aria-label="참여자 정보" aria-expanded={membersOpen} onClick={() => setMembersOpen((value) => !value)}><Users size={17} /><span>참여자</span><b>{members.length}</b></button>
        </header>
        {(chat.error || connectionProblem || roomsError) && <div className="connection-banner" role="status"><AlertCircle size={16} /><span>{roomsError || chat.error || (chat.socketState === "reconnecting" ? "연결을 복구하고 있습니다. 작성 중인 내용은 유지됩니다." : "연결이 끊겼습니다. 다시 연결해 주세요.")}</span><button className="icon-button" aria-label={roomsError ? "방 목록 다시 불러오기" : "다시 연결"} title="다시 연결" onClick={roomsError ? () => setRoomAttempt((value) => value + 1) : chat.reconnect}><RefreshCw size={16} /></button></div>}
        <MessageTimeline key={activeRoomId} messages={activeRoom ? chat.messages.filter((message) => message.roomId === activeRoomId) : []} people={people} roomName={activeRoom?.name ?? ""} loading={roomsLoading || (!!activeRoom && chat.historyState === "loading")} unavailable={!!roomsError || connectionProblem || chat.historyState === "error"} react={chat.react} />
        <Composer roomName={activeRoom?.name ?? ""} draft={drafts[activeRoomId] ?? ""} setDraft={(value) => setDrafts((current) => ({ ...current, [activeRoomId]: value }))} canPost={!!activeRoom?.canPost} socketState={chat.socketState} isSending={chat.isSending} send={() => chat.send(drafts[activeRoomId] ?? "")} />
      </section>
      {membersOpen && wide && <aside className="members-slot">{membersPanel}</aside>}
    </div>
    {compact && navigationOpen && <PanelDialog label="대화방 및 검색" side="left" close={() => setNavigationOpen(false)}>{navigation}</PanelDialog>}
    {membersOpen && !wide && <PanelDialog label="참여자 정보" side="right" close={() => setMembersOpen(false)}>{membersPanel}</PanelDialog>}
  </main>;
}
