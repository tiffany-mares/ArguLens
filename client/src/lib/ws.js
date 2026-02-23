const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

let socket = null;
let listeners = new Set();
let reconnectTimer = null;
const RECONNECT_DELAY = 2000;

export function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(WS_URL);

  socket.addEventListener("open", () => {
    console.log("[ws] connected");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  socket.addEventListener("message", (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    for (const handler of listeners) {
      handler(data);
    }
  });

  socket.addEventListener("close", () => {
    console.log("[ws] disconnected — reconnecting...");
    socket = null;
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

export function send(type, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("[ws] not connected");
    return;
  }
  socket.send(JSON.stringify({ type, payload }));
}

export function onMessage(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}
