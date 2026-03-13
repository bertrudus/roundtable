import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  description: text("description"),
  turnMode: text("turn_mode", { enum: ["round-robin", "open-floor", "directed"] })
    .notNull()
    .default("round-robin"),
  status: text("status", {
    enum: ["configuring", "active", "paused", "completed"],
  })
    .notNull()
    .default("configuring"),
  config: text("config", { mode: "json" }).notNull(), // full SessionConfig JSON
  currentTurn: integer("current_turn").notNull().default(0),
  currentSpeakerId: text("current_speaker_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  provider: text("provider", { enum: ["openai", "anthropic", "gemini"] }).notNull(),
  model: text("model").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  personality: text("personality"),
  color: text("color").notNull(),
  seatIndex: integer("seat_index").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  participantName: text("participant_name").notNull(),
  role: text("role", { enum: ["system", "assistant", "user", "moderator"] }).notNull(),
  content: text("content").notNull(),
  turnNumber: integer("turn_number").notNull(),
  tokenCount: integer("token_count"),
  durationMs: integer("duration_ms"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const briefings = sqliteTable("briefings", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
