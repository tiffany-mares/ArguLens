import { nanoid } from "nanoid";

export const rooms = new Map();

export function createRoom({ motion }) {
  const roomId = nanoid(8);
  rooms.set(roomId, {
    motion,
    createdAt: Date.now(),
    status: "LIVE",
    participants: new Map(),
    messages: []
  });
  return roomId;
}
