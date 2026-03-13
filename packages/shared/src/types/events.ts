import type { Message, StreamingChunk } from "./message";
import type { SessionStatus } from "./session";

// Client -> Server events
export interface ClientEvents {
  "session:start": { sessionId: string };
  "session:pause": { sessionId: string };
  "session:resume": { sessionId: string };
  "session:stop": { sessionId: string };
  "human:message": { sessionId: string; content: string };
}

// Server -> Client events
export interface ServerEvents {
  "session:status": { sessionId: string; status: SessionStatus };
  "turn:start": { sessionId: string; participantId: string; turnNumber: number };
  "turn:end": { sessionId: string; participantId: string; turnNumber: number };
  "message:chunk": StreamingChunk;
  "message:complete": Message;
  "error": { sessionId: string; message: string };
}
