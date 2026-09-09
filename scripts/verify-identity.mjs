// Local-only integration: existing dev fixtures, clearly labelled test messages.
import assert from "node:assert/strict";
const base = new URL(process.env.FLEX_WORKER_URL || "http://127.0.0.1:8791");
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)) throw new Error("This verification only writes to localhost.");
const request = (path, actor) => fetch(new URL(path, base), { headers: { "X-Flex-Dev-User": actor } });
const sockets = [];
async function open(actor) {
  const url = new URL(`/rooms/all/ws?devActor=${actor}`, base);
  url.protocol = "ws:";
  const ws = new WebSocket(url);
  sockets.push(ws);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Socket timeout")), 5000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(Error("Socket error")); }, { once: true });
  });
  return ws;
}
function next(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Event timeout")), 5000);
    ws.addEventListener("message", event => { clearTimeout(timer); resolve(JSON.parse(event.data)); }, { once: true });
  });
}
try {
  for (const actor of ["me", "kim"]) {
    const response = await request("/rooms", actor);
    assert.equal(response.status, 200);
    assert.ok((await response.json()).rooms.some(room => room.id === "all"));
    assert.equal((await request("/rooms/all/messages", actor)).status, 200);
  }
  assert.equal((await request("/rooms/rnd/messages", "kim")).status, 403);
  assert.equal((await request("/rooms/all/messages", "unknown-fixture")).status, 403);
  const [a, b] = await Promise.all([open("kim"), open("me")]);
  let sequence = 0;
  for (const type of ["text", "system", "notice", "live"]) {
    const pending = [next(a), next(b)];
    a.send(JSON.stringify({ type: "message.create", messageType: type, body: `[DEV identity verification] ${crypto.randomUUID()}`, senderId: "me", metadata: { verification: true } }));
    const [first, second] = await Promise.all(pending);
    assert.deepEqual(first, second);
    assert.equal(first.event, "message.created");
    assert.equal(first.message.senderId, "kim");
    assert.equal(first.message.type, type);
    assert.ok(first.message.sequence > sequence);
    sequence = first.message.sequence;
    const history = await (await request("/rooms/all/messages", "kim")).json();
    assert.deepEqual(history.messages.find(message => message.id === first.message.id), first.message);
  }
  console.log("PASS: me/kim rooms/history, denied fixture access, browser-style WS identity, spoofed sender ignored, four message types, two-client canonical broadcast, sequence and D1 history round-trip. Four local test messages written.");
} finally {
  for (const ws of sockets) ws.close();
}
