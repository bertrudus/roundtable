import { useCallback } from "react";
import { useDiscussionStore } from "@/stores/discussionStore";
import type { ParticipantConfig } from "@roundtable/shared";

export function useDiscussion() {
  const store = useDiscussionStore();

  const getParticipant = useCallback(
    (id: string): ParticipantConfig | undefined => {
      return store.session?.config.participants.find((p) => p.id === id);
    },
    [store.session]
  );

  const getCurrentSpeaker = useCallback((): ParticipantConfig | undefined => {
    if (!store.currentSpeakerId) return undefined;
    return getParticipant(store.currentSpeakerId);
  }, [store.currentSpeakerId, getParticipant]);

  const getStreamingText = useCallback(
    (participantId: string): string => {
      return store.streamingContent[participantId] || "";
    },
    [store.streamingContent]
  );

  const isSpeaking = useCallback(
    (participantId: string): boolean => {
      return store.currentSpeakerId === participantId && store.isActive;
    },
    [store.currentSpeakerId, store.isActive]
  );

  const getLastMessage = useCallback(
    (participantId: string) => {
      return [...store.messages]
        .reverse()
        .find((m) => m.participantId === participantId);
    },
    [store.messages]
  );

  return {
    ...store,
    getParticipant,
    getCurrentSpeaker,
    getStreamingText,
    isSpeaking,
    getLastMessage,
  };
}
