import { Users, X } from "lucide-react";
import { resolveCurrentActor } from "../identity/currentActor";
import { departmentNames } from "../providers/mockOrganization";
import type { Person } from "../types/chat";
import { Avatar } from "./Avatar";

const presenceLabels = { online: "온라인", away: "자리 비움", offline: "오프라인" };
export function MembersPanel({ members, close }: { members: Person[]; close: () => void }) {
  return <div className="members-panel">
    <header className="panel-heading"><h2><Users size={17} />참여자 <span>{members.length}</span></h2><button className="icon-button" onClick={close} aria-label="참여자 닫기"><X size={18} /></button></header>
    <p className="fixture-note">테스트 조직 정보 <span className="mock-badge">MOCK</span><small>참여자와 접속 상태는 예시 데이터입니다.</small></p>
    <div className="member-list">{members.length ? members.map((person) => <div className="member" key={person.id}>
      <Avatar person={person} presence /><div><b>{person.name}{person.id === resolveCurrentActor().id && <span className="me-label">나</span>}</b><small>{departmentNames[person.departmentId]} · {person.title}</small><small className="member-presence">{presenceLabels[person.presence]}</small></div>
    </div>) : <p className="nav-feedback">이 방의 테스트 참여자 정보가 없습니다.</p>}</div>
  </div>;
}
