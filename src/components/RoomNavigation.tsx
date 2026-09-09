import { Building2, Hash, MessageCircle, Search, X } from "lucide-react";
import { resolveCurrentActor } from "../identity/currentActor";
import type { Person, Room } from "../types/chat";
import { Avatar } from "./Avatar";

export function RoomNavigation({ rooms, activeId, query, setQuery, onSelect, person, loading, error, retry, close }: {
  rooms: Room[]; activeId: string; query: string; setQuery: (value: string) => void;
  onSelect: (id: string) => void; person?: Person; loading: boolean; error: string; retry: () => void; close: () => void;
}) {
  const filtered = rooms.filter((room) => room.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="room-navigation">
    <div className="workspace-heading"><span className="workspace-logo">M</span><div><b>Mona-HUB</b><small>우리의 업무, 이어지는 대화</small></div><button className="icon-button mobile-only" onClick={close} aria-label="방 목록 닫기"><X size={18} /></button></div>
    <label className="room-search"><Search size={16} /><input aria-label="방 검색" placeholder="방 검색" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button className="icon-button" onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={14} /></button>}</label>
    <div className="section-heading"><span>대화방</span><span>{rooms.length}</span></div>
    <nav className="room-list" aria-label="대화방">
      {loading ? <p className="nav-feedback" role="status">대화방을 불러오는 중…</p> : error ? <div className="nav-feedback" role="alert"><p>대화방을 불러오지 못했습니다.</p><button className="text-button" onClick={retry}>다시 시도</button></div> : !filtered.length ? <p className="nav-feedback">{query ? `‘${query}’ 검색 결과가 없습니다.` : "참여 가능한 대화방이 없습니다."}</p> : filtered.map((room) => {
        const Icon = room.type === "direct" ? MessageCircle : room.type === "department" ? Building2 : Hash;
        return <button key={room.id} className={`room-item ${activeId === room.id ? "active" : ""}`} aria-current={activeId === room.id ? "page" : undefined} onClick={() => onSelect(room.id)}>
          <Icon size={18} /><span className="room-name">{room.name}</span><span className="room-indicators">{!!room.mentionCount && <span className="mention-indicator" aria-label={`멘션 ${room.mentionCount}개`}>@</span>}</span>
        </button>;
      })}
    </nav>
    <div className="nav-bottom"><span>가볍게 연결되는 업무 공간</span><div className="self-profile"><Avatar person={person} /><div><b>{person?.name ?? resolveCurrentActor().id}<span>나</span></b><small>{person?.title ?? "개발 사용자"} · 테스트 프로필</small></div><span className="mock-badge">MOCK</span></div></div>
  </div>;
}
