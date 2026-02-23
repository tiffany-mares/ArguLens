import { z } from "zod";

export const ClientEventSchema = z.object({
  type: z.string(),
  payload: z.any().optional()
});

export const CreateRoomPayload = z.object({
  motion: z.string().min(5).max(200),
  name: z.string().min(1).max(30)
});

export const JoinRoomPayload = z.object({
  roomId: z.string(),
  name: z.string().min(1).max(30)
});

export const SetRolePayload = z.object({
  roomId: z.string(),
  role: z.enum(["A", "B", "AUDIENCE"])
});

export const SendMessagePayload = z.object({
  roomId: z.string(),
  text: z.string().min(1).max(800)
});

export const EndDebatePayload = z.object({
  roomId: z.string()
});

export const RewritePayload = z.object({
  messageId: z.string(),
  text: z.string().min(1).max(800)
});
