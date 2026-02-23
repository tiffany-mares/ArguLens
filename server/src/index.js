import "dotenv/config";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { nanoid } from "nanoid";

import { rooms, createRoom } from "./rooms.js";
import {
  ClientEventSchema,
  CreateRoomPayload,
  JoinRoomPayload,
  SetRolePayload,
  SendMessagePayload,
  EndDebatePayload,
  RewritePayload
} from "./schemas.js";
import { buildAnalysisPrompt } from "./prompt.js";
import { buildSummaryPrompt } from "./summaryPrompt.js";
import { invokeBedrock, invokeSummary } from "./bedrock.js";

const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const socketRoom = new Map();
const roomSockets = new Map();
const lastMessageTime = new Map();
const MESSAGE_COOLDOWN_MS = 2000;

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcast(roomId, type, payload, excludeWs) {
  const sockets = roomSockets.get(roomId);
  if (!sockets) return;
  const msg = JSON.stringify({ type, payload });
  for (const ws of sockets) {
    if (ws !== excludeWs && ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}

function getRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const participants = [];
  for (const [, p] of room.participants) {
    participants.push({ name: p.name, role: p.role });
  }
  return {
    roomId,
    motion: room.motion,
    status: room.status,
    participants,
    messageCount: room.messages.length
  };
}

function broadcastRoomState(roomId) {
  const state = getRoomState(roomId);
  if (state) broadcast(roomId, "ROOM_STATE", state);
}

wss.on("connection", (ws) => {
  const socketId = nanoid(10);

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return send(ws, "ERROR", { message: "Invalid JSON" });
    }

    const parsed = ClientEventSchema.safeParse(data);
    if (!parsed.success) {
      return send(ws, "ERROR", { message: "Invalid event shape" });
    }

    const { type, payload } = parsed.data;

    switch (type) {
      case "CREATE_ROOM":
        handleCreateRoom(ws, socketId, payload);
        break;
      case "JOIN_ROOM":
        handleJoinRoom(ws, socketId, payload);
        break;
      case "SET_ROLE":
        handleSetRole(ws, socketId, payload);
        break;
      case "SEND_MESSAGE":
        handleSendMessage(ws, socketId, payload);
        break;
      case "END_DEBATE":
        handleEndDebate(ws, socketId, payload);
        break;
      case "REWRITE_NEUTRAL":
        handleRewriteNeutral(ws, payload);
        break;
      default:
        send(ws, "ERROR", { message: `Unknown event type: ${type}` });
    }
  });

  ws.on("close", () => {
    const roomId = socketRoom.get(socketId);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) room.participants.delete(socketId);

      const sockets = roomSockets.get(roomId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) roomSockets.delete(roomId);
      }

      socketRoom.delete(socketId);
      lastMessageTime.delete(socketId);
      broadcastRoomState(roomId);
    }
  });
});

function handleCreateRoom(ws, socketId, payload) {
  const result = CreateRoomPayload.safeParse(payload);
  if (!result.success) {
    return send(ws, "ERROR", { message: result.error.flatten() });
  }

  const { motion, name } = result.data;
  const roomId = createRoom({ motion });
  const room = rooms.get(roomId);

  room.participants.set(socketId, { name, role: null });

  socketRoom.set(socketId, roomId);
  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
  roomSockets.get(roomId).add(ws);

  send(ws, "ROOM_CREATED", { roomId, motion });
  broadcastRoomState(roomId);
}

function handleJoinRoom(ws, socketId, payload) {
  const result = JoinRoomPayload.safeParse(payload);
  if (!result.success) {
    return send(ws, "ERROR", { message: result.error.flatten() });
  }

  const { roomId, name } = result.data;
  const room = rooms.get(roomId);
  if (!room) {
    return send(ws, "ERROR", { message: "Room not found" });
  }

  room.participants.set(socketId, { name, role: null });

  socketRoom.set(socketId, roomId);
  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
  roomSockets.get(roomId).add(ws);

  send(ws, "ROOM_JOINED", { roomId, motion: room.motion });
  broadcastRoomState(roomId);
}

function handleSetRole(ws, socketId, payload) {
  const result = SetRolePayload.safeParse(payload);
  if (!result.success) {
    return send(ws, "ERROR", { message: result.error.flatten() });
  }

  const { roomId, role } = result.data;
  const room = rooms.get(roomId);
  if (!room) {
    return send(ws, "ERROR", { message: "Room not found" });
  }

  const participant = room.participants.get(socketId);
  if (!participant) {
    return send(ws, "ERROR", { message: "Not in this room" });
  }

  if (role === "A" || role === "B") {
    for (const [sid, p] of room.participants) {
      if (sid !== socketId && p.role === role) {
        return send(ws, "ERROR", {
          message: `Speaker ${role} is already taken`
        });
      }
    }
  }

  participant.role = role;
  broadcastRoomState(roomId);
}

function handleSendMessage(ws, socketId, payload) {
  const result = SendMessagePayload.safeParse(payload);
  if (!result.success) {
    return send(ws, "ERROR", { message: result.error.flatten() });
  }

  const { roomId, text } = result.data;
  const room = rooms.get(roomId);
  if (!room) {
    return send(ws, "ERROR", { message: "Room not found" });
  }
  if (room.status !== "LIVE") {
    return send(ws, "ERROR", { message: "Debate has ended" });
  }

  const participant = room.participants.get(socketId);
  if (!participant) {
    return send(ws, "ERROR", { message: "Not in this room" });
  }
  if (participant.role !== "A" && participant.role !== "B") {
    return send(ws, "ERROR", { message: "Only speakers can send messages" });
  }

  const now = Date.now();
  const lastSent = lastMessageTime.get(socketId) || 0;
  if (now - lastSent < MESSAGE_COOLDOWN_MS) {
    return send(ws, "ERROR", { message: "Slow down — wait 2 seconds between messages" });
  }
  lastMessageTime.set(socketId, now);

  const message = {
    id: nanoid(12),
    speakerRole: participant.role,
    speakerName: participant.name,
    text,
    ts: Date.now()
  };

  room.messages.push(message);

  broadcast(roomId, "MESSAGE_RECEIVED", { message });

  const recentMessages = room.messages.slice(-5, -1);
  const prompt = buildAnalysisPrompt({
    motion: room.motion,
    speakerRole: participant.role,
    messageText: text,
    recentMessages
  });

  invokeBedrock(prompt).then((analysis) => {
    broadcast(roomId, "ANALYSIS_RESULT", {
      messageId: message.id,
      analysis
    });
  });
}

function handleEndDebate(ws, socketId, payload) {
  const result = EndDebatePayload.safeParse(payload);
  if (!result.success) {
    return send(ws, "ERROR", { message: result.error.flatten() });
  }

  const { roomId } = result.data;
  const room = rooms.get(roomId);
  if (!room) {
    return send(ws, "ERROR", { message: "Room not found" });
  }

  room.status = "ENDED";
  broadcast(roomId, "DEBATE_ENDED", { roomId });
  broadcastRoomState(roomId);

  if (room.messages.length > 0) {
    const prompt = buildSummaryPrompt({
      motion: room.motion,
      messages: room.messages
    });

    invokeSummary(prompt).then((summary) => {
      broadcast(roomId, "DEBATE_SUMMARY", { roomId, summary });
    });
  }
}

function handleRewriteNeutral(ws, payload) {
  const result = RewritePayload.safeParse(payload);
  if (!result.success) {
    return send(ws, "ERROR", { message: result.error.flatten() });
  }

  const { messageId, text } = result.data;

  const prompt = `You are a neutral language editor. Rewrite the following debate message to remove all loaded language, bias, stereotypes, and emotional manipulation while preserving the original meaning and argument structure.

Original message:
"${text}"

Return ONLY a JSON object with this exact shape:
{
  "rewrite": "<the neutrally rewritten message>"
}

RULES:
- Keep the core argument and evidence intact.
- Remove loaded words, stereotypes, absolutist language, and framing bias.
- Make the tone neutral and objective.
- Return ONLY the JSON object. No markdown, no explanation.`;

  invokeBedrock(prompt).then((response) => {
    let rewrite = text;
    try {
      if (typeof response === "object" && response.rewrite) {
        rewrite = response.rewrite;
      } else if (typeof response === "string") {
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.rewrite) rewrite = parsed.rewrite;
        }
      }
    } catch {
      // fall back to original text
    }
    send(ws, "REWRITE_RESULT", { messageId, rewrite });
  });
}

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
