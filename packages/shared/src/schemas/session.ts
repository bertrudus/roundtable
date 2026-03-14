import { z } from "zod";

export const participantConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  provider: z.enum(["openai", "anthropic", "gemini"]),
  model: z.string().min(1),
  systemPrompt: z.string().min(1),
  personality: z.string().optional(),
  voiceId: z.string().optional(),
  avatarUrl: z.string().optional(),
  color: z.string(),
  isHuman: z.boolean().optional(),
  isChair: z.boolean().optional(),
});

export const sessionConfigSchema = z.object({
  topic: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  turnMode: z.enum(["round-robin", "open-floor", "directed"]),
  maxTurns: z.number().int().positive().optional(),
  turnTimeLimit: z.number().int().positive().optional(),
  responseLength: z.enum(["verbose", "brief", "expansive"]).optional(),
  discussionQuality: z.enum(["fast", "balanced", "quality"]).optional(),
  discussionMode: z.enum(["debate", "review", "critic"]).optional(),
  enableChair: z.boolean().optional(),
  documents: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })).optional(),
  participants: z
    .array(participantConfigSchema)
    .min(2, "At least 2 participants required")
    .max(8, "Maximum 8 participants"),
});

export const createSessionSchema = z.object({
  config: sessionConfigSchema,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
