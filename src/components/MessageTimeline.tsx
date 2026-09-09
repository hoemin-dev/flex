import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Bell, MessageCircleMore, Radio, Reply, SmilePlus } from "lucide-react";
import { resolveCurrentActor } from "../identity/currentActor";
import { dayKey, dayLabel, isGrouped, timeLabel } from "../lib/messages";
import type { Message, Person } from "../types/chat";
import { Avatar } from "./Avatar";

function RichText({ content }: { content: string }) {
  return <>{content.split(/(@[^\s@]+)/g).map((part, index) => part.startsWith("@") ? <mark key={index}>{part}</mark> : part)}</>;
}
function TimelineMessage({ message, grouped, people, messages, react }: { message: Message; grouped: boolean; people: Person[]; messages: Message[]; react: (id: string, emoji: string) => void }) {
  const person = people.find((item) => item.id === message.authorId);
  const author = person?.name ?? message.authorId ?? "알 수 없는 사용자";
  if (message.kind === "system") return <article className="system-message"><span>{message.content}</span><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></article>;
  if (message.kind !== "text") {
    const Icon = message.kind === "live" ? Radio : Bell;
    return <article className={`event-message ${message.kind}`}><Icon size={17} /><div><div className="event-heading"><b>{message.metadata?.label || (message.kind === "live" ? "업데이트" : "공지")}</b><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div><p><RichText content={message.content} /></p>{message.metadata?.detail && <small>{message.metadata.detail}</small>}</div></article>;
  }
  const reply = messages.find((item) => item.id === message.replyToMessageId);
  return <article className={`message ${grouped ? "grouped" : ""} ${message.authorId === resolveCurrentActor().id ? "own" : ""}`} aria-label={`${author}, ${timeLabel(message.createdAt)}`}>
    <div className="message-gutter">{grouped ? <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time> : <Avatar person={person} />}</div>
    <div className="message-body">{!grouped && <div className="message-meta"><b>{author}</b>{message.authorId === resolveCurrentActor().id && <span className="me-label">나</span>}<span className="author-title">{person?.title}</span><time dateTime={message.createdAt} title={message.createdAt}>{timeLabel(message.createdAt)}</time></div>}
      {message.replyToMessageId && <div className="reply-context"><Reply size={13} /><span>{reply ? `${people.find((item) => item.id === reply.authorId)?.name ?? reply.authorId ?? "메시지"}: ${reply.content}` : "이전 메시지에 대한 답장 · 원문이 현재 기록에 없습니다"}</span></div>}
      <p><RichText content={message.content} /></p>
      {!!message.reactions?.length && <div className="reaction-row">{message.reactions.map((reaction) => <button key={reaction.emoji} className={reaction.personIds.includes(resolveCurrentActor().id) ? "selected" : ""} aria-pressed={reaction.personIds.includes(resolveCurrentActor().id)} aria-label={`${reaction.emoji} 반응 ${reaction.personIds.length}개, 이 창에서만 적용`} title="이 창에서만 적용되는 반응" onClick={() => react(message.id, reaction.emoji)}>{reaction.emoji}<span>{reaction.personIds.length}</span></button>)}</div>}
    </div><button className="message-reaction icon-button" aria-label={`${author} 메시지에 좋아요, 이 창에서만 적용`} title="좋아요 · 이 창에서만 적용" onClick={() => react(message.id, "👍")}><SmilePlus size={15} /></button>
  </article>;
}

export function MessageTimeline({ messages, people, roomName, loading, unavailable, react }: {
  messages: Message[]; people: Person[]; roomName: string; loading: boolean; unavailable: boolean; react: (id: string, emoji: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const bottom = useRef(true);
  const previousLast = useRef<string>();
  const [newMessages, setNewMessages] = useState(false);
  const scrollBottom = () => { if (list.current) list.current.scrollTop = list.current.scrollHeight; bottom.current = true; setNewMessages(false); };
  useLayoutEffect(() => {
    const last = messages.at(-1);
    if (bottom.current || (last?.id !== previousLast.current && last?.authorId === resolveCurrentActor().id)) scrollBottom();
    else if (last?.id !== previousLast.current) setNewMessages(true);
    previousLast.current = last?.id;
  }, [messages]);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const observer = new ResizeObserver(() => { if (bottom.current) scrollBottom(); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="timeline-wrap"><div ref={list} className="message-list" role="region" aria-label={`${roomName} 대화 기록`} tabIndex={0} onScroll={() => {
    const element = list.current!;
    bottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
    if (bottom.current) setNewMessages(false);
  }}>
    {messages.length > 0 ? <><div className="history-caption">최근 대화 기록 <span>반응은 이 창에서만 적용됩니다</span></div>{messages.map((message, index) => <Fragment key={message.id}>
      {(!index || dayKey(messages[index - 1].createdAt) !== dayKey(message.createdAt)) && <div className="day-divider"><span>{dayLabel(message.createdAt)}</span></div>}
      <TimelineMessage message={message} grouped={isGrouped(messages[index - 1], message)} people={people} messages={messages} react={react} />
    </Fragment>)}</> : <div className="empty-state" role="status"><span className="empty-icon"><MessageCircleMore size={28} /></span><small>Flex · 팀 대화</small><h2>{unavailable ? "연결을 기다리고 있어요" : loading ? "대화를 불러오고 있어요" : roomName ? `${roomName}의 대화를 시작하세요` : "함께 이야기할 공간"}</h2><p>{unavailable ? "연결 상태를 확인하고 다시 시도해 주세요." : loading ? "최근 메시지를 확인하고 있습니다." : roomName ? "공유할 소식이나 짧은 질문을 남겨보세요.\n팀의 대화가 이곳에 차곡차곡 이어집니다." : "대화방을 선택하면 최근 메시지를 볼 수 있습니다."}</p></div>}
  </div>{newMessages && <button className="new-messages" onClick={scrollBottom}><ArrowDown size={14} />새 메시지 · 아래로 이동</button>}<span className="sr-only" role="status">{newMessages ? "새 메시지가 있습니다." : ""}</span></div>;
}
