import { describe, expect, it, vi } from "vitest";
import { resolveCurrentActor } from "./identity";
import worker from "./index";

describe("development actor boundary", () => {
  const env = { DEV_ALLOW_MOCK_IDENTITY: "true" };
  it("uses the same actor for HTTP and browser WebSockets", () => {
    expect(resolveCurrentActor(new Request("https://test/rooms", { headers: { "X-Flex-Dev-User": "kim" } }), env)).toBe("kim");
    expect(resolveCurrentActor(new Request("https://test/rooms/all/ws?devActor=kim"), env)).toBe("kim");
    expect(resolveCurrentActor(new Request("https://test/rooms"), env)).toBe("me");
  });
  it("fails closed for disabled, malformed or conflicting identities", () => {
    expect(resolveCurrentActor(new Request("https://test/rooms?devActor=kim"), {})).toBeNull();
    for (const query of ["", "bad%20id", "kim&devActor=lee"]) {
      expect(resolveCurrentActor(new Request(`https://test/rooms?devActor=${query}`), env)).toBeNull();
    }
    expect(resolveCurrentActor(new Request("https://test/rooms?devActor=lee", { headers: { "X-Flex-Dev-User": "kim" } }), env)).toBeNull();
  });
  it("authorizes the socket actor and overwrites untrusted internal headers", async () => {
    const bind = vi.fn().mockReturnValue({ first: async () => ({ allowed: 1 }) });
    const forward = vi.fn(async (request: Request) => {
      expect(request.headers.get("X-Flex-User-Id")).toBe("kim");
      return new Response("forwarded");
    });
    const response = await worker.fetch(new Request("https://test/rooms/all/ws?devActor=kim", { headers: { Upgrade: "websocket", "X-Flex-User-Id": "me" } }), {
      ...env, DB: { prepare: () => ({ bind }) }, ROOMS: { idFromName: () => "all", get: () => ({ fetch: forward }) }
    } as unknown as Parameters<typeof worker.fetch>[1]);
    expect(response.status).toBe(200);
    expect(bind).toHaveBeenCalledWith("all", "kim");
    expect(forward).toHaveBeenCalledOnce();
  });
});
