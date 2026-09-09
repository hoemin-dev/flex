import type { CreatedMessage } from "../services/roomSocket";
import type { Message } from "../types/chat";

export function mergeMessages(current: Message[], incoming: CreatedMessage[]): Message[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, {
      id: message.id, sequence: message.sequence, roomId: message.roomId,
      authorId: message.senderId, kind: message.type, content: message.body,
      createdAt: message.createdAt, replyToMessageId: message.replyToMessageId,
      reactions: byId.get(message.id)?.reactions,
      metadata: message.metadata ? {
        label: typeof message.metadata.label === "string" ? message.metadata.label : undefined,
        detail: typeof message.metadata.detail === "string" ? message.metadata.detail : undefined
      } : undefined
    });
  }
  return [...byId.values()].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

function dateOf(value: string) {
  // Legacy fixtures contain clock-only labels; never invent a date for them.
  return /^\d{4}-\d{2}-\d{2}/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
}
export function dayKey(value: string) {
  const date = dateOf(value);
  return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : "undated";
}
export function timeLabel(value: string) {
  const date = dateOf(value);
  return date ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date) : value;
}
export function dayLabel(value: string, now = new Date()) {
  const date = dateOf(value);
  if (!date) return "대화 기록";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(value) === dayKey(now.toISOString())) return "오늘";
  if (dayKey(value) === dayKey(yesterday.toISOString())) return "어제";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date);
}
export function isGrouped(previous: Message | undefined, current: Message) {
  if (!previous || previous.kind !== "text" || current.kind !== "text" || !current.authorId || previous.authorId !== current.authorId || current.replyToMessageId || previous.roomId !== current.roomId) return false;
  const gap = Date.parse(current.createdAt) - Date.parse(previous.createdAt);
  return dayKey(previous.createdAt) === dayKey(current.createdAt) && gap >= 0 && gap < 5 * 60_000;
}

export function toggleReaction(messages: Message[], messageId: string, emoji: string, userId: string) {
  return messages.map((message) => {
    if (message.id !== messageId) return message;
    const existing = message.reactions?.find((reaction) => reaction.emoji === emoji);
    const personIds = existing?.personIds.includes(userId) ? existing.personIds.filter((id) => id !== userId) : [...(existing?.personIds ?? []), userId];
    const reactions = [...(message.reactions ?? []).filter((reaction) => reaction.emoji !== emoji), { emoji, personIds }].filter((reaction) => reaction.personIds.length);
    return { ...message, reactions };
  });
}
