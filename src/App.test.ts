import { describe, expect, it } from "vitest";
import { mergeMessages } from "./App";
import type { CreatedMessage } from "./services/roomSocket";

function message(id: string, sequence: number): CreatedMessage {
  return {
    id, sequence, roomId: "rnd", senderId: "me", type: "text", body: id,
    replyToMessageId: null, metadata: null, createdAt: "2026-08-24T00:00:00.000Z", editedAt: null
  };
}

describe("mergeMessages", () => {
  it("deduplicates history and socket events by id and orders by sequence", () => {
    const fromSocket = mergeMessages([], [message("m2", 2)]);
    const withHistory = mergeMessages(fromSocket, [message("m1", 1), message("m2", 2)]);

    expect(withHistory.map(({ id, sequence }) => ({ id, sequence }))).toEqual([
      { id: "m1", sequence: 1 },
      { id: "m2", sequence: 2 }
    ]);
  });
});
