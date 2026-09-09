import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, isGrouped, mergeMessages, toggleReaction } from "./messages";
import type { CreatedMessage } from "../services/roomSocket";
import type { Message } from "../types/chat";

const source: CreatedMessage = { id: "one", sequence: 1, roomId: "rnd", senderId: "me", type: "text", body: "첫 줄\n둘째 줄", createdAt: "2026-09-08T10:00:00Z", replyToMessageId: "original", metadata: { label: "공지", detail: 123 }, editedAt: null };
const message: Message = { id: "one", roomId: "rnd", authorId: "me", kind: "text", content: "안녕하세요", createdAt: "2026-09-08T10:00:00Z" };
describe("timeline presentation", () => {
  it("retains dates, newlines and reply references without trusting metadata types", () => {
    const [result] = mergeMessages([], [source]);
    expect(result.createdAt).toBe(source.createdAt);
    expect(result.content).toBe("첫 줄\n둘째 줄");
    expect(result.replyToMessageId).toBe("original");
    expect(result.metadata).toEqual({ label: "공지", detail: undefined });
  });
  it("groups only consecutive text by the same sender within five minutes", () => {
    const next = { ...message, id: "two", createdAt: "2026-09-08T10:04:59Z" };
    expect(isGrouped(message, next)).toBe(true);
    expect(isGrouped(message, { ...next, createdAt: "2026-09-08T10:05:00Z" })).toBe(false);
    expect(isGrouped(message, { ...next, authorId: "kim" })).toBe(false);
    expect(isGrouped(message, { ...next, kind: "notice" })).toBe(false);
    expect(isGrouped(message, { ...next, replyToMessageId: "one" })).toBe(false);
    expect(isGrouped(message, { ...next, roomId: "all" })).toBe(false);
  });
  it("separates local calendar days and supports legacy clock-only fixtures", () => {
    const before = new Date(2026, 8, 8, 23, 59).toISOString();
    const after = new Date(2026, 8, 9, 0, 1).toISOString();
    expect(dayKey(before)).not.toBe(dayKey(after));
    expect(isGrouped({ ...message, createdAt: before }, { ...message, createdAt: after })).toBe(false);
    expect(dayLabel(before, new Date(after))).toBe("어제");
    expect(dayLabel(after, new Date(after))).toBe("오늘");
    expect(dayLabel("09:14")).toBe("대화 기록");
  });
  it("toggles the selected emoji independently and removes empty reactions", () => {
    const withReaction = toggleReaction([message], "one", "👍", "me");
    const withTwo = toggleReaction(withReaction, "one", "🙌", "kim");
    const removed = toggleReaction(withTwo, "one", "👍", "me");
    expect(removed[0].reactions).toEqual([{ emoji: "🙌", personIds: ["kim"] }]);
  });
  it("preserves local reactions when history overlaps live events", () => {
    const reacted = toggleReaction(mergeMessages([], [source]), "one", "👍", "me");
    const result = mergeMessages(reacted, [source, source]);
    expect(result).toHaveLength(1);
    expect(result[0].reactions?.[0].personIds).toEqual(["me"]);
  });
});
