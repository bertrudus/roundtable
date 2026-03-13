export type MessageRole = "system" | "assistant" | "user" | "moderator";

export interface Message {
  id: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  role: MessageRole;
  content: string;
  turnNumber: number;
  timestamp: string;
}

export interface TranscriptEntry extends Message {
  provider: string;
  model: string;
  tokenCount?: number;
  durationMs?: number;
}

export interface StreamingChunk {
  sessionId: string;
  participantId: string;
  content: string;
  done: boolean;
}
