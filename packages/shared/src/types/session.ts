import type { AIProvider } from "./provider";

export type SessionStatus = "configuring" | "active" | "paused" | "completed";

export type TurnMode = "round-robin" | "open-floor" | "directed";

export type ResponseLength = "brief" | "short" | "medium" | "long";

export interface ParticipantConfig {
  id: string;
  name: string;
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  personality?: string;
  voiceId?: string;
  avatarUrl?: string;
  color: string;
  isHuman?: boolean;
  isChair?: boolean;
}

export interface SessionConfig {
  topic: string;
  description?: string;
  turnMode: TurnMode;
  maxTurns?: number;
  turnTimeLimit?: number; // seconds
  responseLength?: ResponseLength;
  enableChair?: boolean;
  participants: ParticipantConfig[];
}

export interface Session {
  id: string;
  config: SessionConfig;
  status: SessionStatus;
  currentTurn: number;
  currentSpeakerId: string | null;
  createdAt: string;
  updatedAt: string;
}
