const baseUrl = process.env.FLEX_WORKER_URL || "ws://127.0.0.1:8787";
const roomId = process.env.FLEX_TEST_ROOM_ID || "integration";

function openSocket() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${baseUrl}/rooms/${encodeURIComponent(roomId)}/ws`);
    const timer = setTimeout(() => reject(new Error("WebSocket open timed out")), 5000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(socket); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("WebSocket open failed")); }, { once: true });
  });
}

function nextCreatedMessage(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("message.created timed out")), 5000);
    socket.addEventListener("message", (event) => {
      clearTimeout(timer);
      const parsed = JSON.parse(String(event.data));
      if (parsed.event !== "message.created") reject(new Error(`Unexpected event: ${event.data}`));
      else resolve(parsed);
    }, { once: true });
  });
}

const [clientA, clientB] = await Promise.all([openSocket(), openSocket()]);
const receivedA = nextCreatedMessage(clientA);
const receivedB = nextCreatedMessage(clientB);
clientA.send(JSON.stringify({ type: "message.create", body: `integration-${crypto.randomUUID()}` }));
const [eventA, eventB] = await Promise.all([receivedA, receivedB]);

if (JSON.stringify(eventA) !== JSON.stringify(eventB)) throw new Error("Clients received different canonical messages");
console.log(JSON.stringify(eventA));
clientA.close();
clientB.close();
