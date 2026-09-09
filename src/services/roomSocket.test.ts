import { afterEach, expect, it, vi } from "vitest";
vi.mock("../identity/currentActor", async () => {
  const { DEV_ACTOR_HEADER, DEV_ACTOR_QUERY } = await import("../../shared/devIdentity");
  return {
    currentActorHeaders: () => ({ [DEV_ACTOR_HEADER]: "kim" }),
    applyCurrentActorToSocketUrl: (url: URL) => url.searchParams.set(DEV_ACTOR_QUERY, "kim")
  };
});
import { connectRoomSocket, listRooms, listRoomMessages } from "./roomSocket";
afterEach(() => vi.unstubAllGlobals());
it("carries a non-default provider actor in both HTTP APIs and the socket URL", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  const socket = vi.fn().mockImplementation(() => ({ addEventListener: vi.fn() }));
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("WebSocket", socket);
  await listRooms();
  await listRoomMessages("all");
  connectRoomSocket("all", () => {});
  for (const [, options] of fetch.mock.calls) expect(options.headers["X-Flex-Dev-User"]).toBe("kim");
  expect(socket.mock.calls[0][0].searchParams.get("devActor")).toBe("kim");
});
