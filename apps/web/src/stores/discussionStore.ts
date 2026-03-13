import { create } from "zustand";
import type { Session, SessionConfig, Message, ParticipantConfig } from "@roundtable/shared";

interface DiscussionState {
  session: Session | null;
  messages: Message[];
  currentSpeakerId: string | null;
  streamingContent: Record<string, string>;
  isActive: boolean;
  error: string | null;
  waitingForHuman: boolean;
  ttsEnabled: boolean;
  speechRate: number;
  speakingTTS: string | null;
  mouthOpen: Record<string, boolean>;
  summary: string | null;

  // Actions
  createSession: (config: SessionConfig) => Promise<void>;
  startDiscussion: () => void;
  stopDiscussion: () => void;
  submitHumanMessage: (content: string) => void;
  signalReady: () => void;
  addParticipantLive: (config: ParticipantConfig) => void;
  removeParticipantLive: (id: string) => void;
  addMessage: (message: Message) => void;
  setStreamingContent: (participantId: string, content: string) => void;
  appendStreamingContent: (participantId: string, chunk: string) => void;
  clearStreamingContent: (participantId: string) => void;
  setCurrentSpeaker: (participantId: string | null) => void;
  setError: (error: string | null) => void;
  setActive: (active: boolean) => void;
  setTTSEnabled: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setSpeakingTTS: (participantId: string | null) => void;
  setMouthOpen: (participantId: string, open: boolean) => void;
  reset: () => void;
}

export const useDiscussionStore = create<DiscussionState>((set, get) => ({
  session: null,
  messages: [],
  currentSpeakerId: null,
  streamingContent: {},
  isActive: false,
  error: null,
  waitingForHuman: false,
  ttsEnabled: true,
  speechRate: 1,
  speakingTTS: null,
  mouthOpen: {},
  summary: null,

  createSession: async (config: SessionConfig) => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create session");
      }

      const data = await res.json();
      set({
        session: {
          id: data.id,
          config,
          status: "configuring",
          currentTurn: 0,
          currentSpeakerId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        messages: [],
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to create session",
      });
    }
  },

  startDiscussion: () => {
    const { session } = get();
    if (!session) return;

    set({ isActive: true, error: null, waitingForHuman: false });

    fetch("/api/ai/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    }).then(async (response) => {
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case "turn:start":
                set({
                  currentSpeakerId: event.participantId,
                  waitingForHuman: false,
                });
                get().clearStreamingContent(event.participantId);
                break;

              case "chunk":
                get().appendStreamingContent(
                  event.participantId,
                  event.content
                );
                break;

              case "turn:end":
                get().addMessage(event.message);
                get().clearStreamingContent(event.message.participantId);
                break;

              case "human:waiting":
                set({
                  waitingForHuman: true,
                  currentSpeakerId: event.participantId,
                });
                break;

              case "await:ready":
                // Server is waiting — TTS handler will call signalReady()
                // If TTS is disabled, signal immediately
                if (!get().ttsEnabled) {
                  // Small pause even without TTS so it doesn't blast
                  setTimeout(() => get().signalReady(), 1500);
                }
                break;

              case "summary":
                set({ summary: event.summary });
                break;

              case "error":
                set({ error: event.error });
                break;

              case "complete":
                set({
                  isActive: false,
                  currentSpeakerId: null,
                  waitingForHuman: false,
                  session: get().session
                    ? { ...get().session!, status: "completed" }
                    : null,
                });
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    }).catch((err) => {
      set({
        isActive: false,
        error: err instanceof Error ? err.message : "Stream failed",
      });
    });
  },

  stopDiscussion: () => {
    const { session } = get();
    if (!session) return;

    fetch("/api/ai/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, action: "stop" }),
    });

    set({ isActive: false, currentSpeakerId: null, waitingForHuman: false, speakingTTS: null });
  },

  submitHumanMessage: (content: string) => {
    const { session } = get();
    if (!session) return;

    fetch("/api/ai/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        action: "human_message",
        content,
      }),
    });

    set({ waitingForHuman: false });
  },

  signalReady: () => {
    const { session } = get();
    if (!session) return;

    fetch("/api/ai/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, action: "ready" }),
    });
  },

  addParticipantLive: (config: ParticipantConfig) => {
    const { session } = get();
    if (!session) return;

    const updated = {
      ...session,
      config: {
        ...session.config,
        participants: [...session.config.participants, config],
      },
    };
    set({ session: updated });

    // Notify server if active
    if (get().isActive) {
      fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          action: "add_participant",
          participant: config,
        }),
      });
    }
  },

  removeParticipantLive: (id: string) => {
    const { session } = get();
    if (!session) return;
    if (session.config.participants.length <= 2) return;

    const updated = {
      ...session,
      config: {
        ...session.config,
        participants: session.config.participants.filter((p) => p.id !== id),
      },
    };
    set({ session: updated });

    if (get().isActive) {
      fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          action: "remove_participant",
          participantId: id,
        }),
      });
    }
  },

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setStreamingContent: (participantId, content) =>
    set((state) => ({
      streamingContent: { ...state.streamingContent, [participantId]: content },
    })),

  appendStreamingContent: (participantId, chunk) =>
    set((state) => ({
      streamingContent: {
        ...state.streamingContent,
        [participantId]:
          (state.streamingContent[participantId] || "") + chunk,
      },
    })),

  clearStreamingContent: (participantId) =>
    set((state) => {
      const { [participantId]: _, ...rest } = state.streamingContent;
      return { streamingContent: rest };
    }),

  setCurrentSpeaker: (participantId) =>
    set({ currentSpeakerId: participantId }),

  setError: (error) => set({ error }),

  setActive: (active) => set({ isActive: active }),

  setTTSEnabled: (enabled) => {
    set({ ttsEnabled: enabled, speakingTTS: enabled ? get().speakingTTS : null });
  },

  setSpeechRate: (rate) => set({ speechRate: rate }),

  setSpeakingTTS: (participantId) => set({ speakingTTS: participantId }),

  setMouthOpen: (participantId, open) =>
    set((state) => ({
      mouthOpen: { ...state.mouthOpen, [participantId]: open },
    })),

  reset: () => {
    set({
      session: null,
      messages: [],
      currentSpeakerId: null,
      streamingContent: {},
      isActive: false,
      error: null,
      waitingForHuman: false,
      speakingTTS: null,
      mouthOpen: {},
      summary: null,
    });
  },
}));
