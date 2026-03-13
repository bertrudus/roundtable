"use client";

import { useEffect, useRef } from "react";
import { useDiscussion } from "@/hooks/useDiscussion";
import { ParticipantSeat } from "./ParticipantSeat";
import { TableCenter } from "./TableCenter";
import { MessageBubble } from "./MessageBubble";
import { HumanInput } from "./HumanInput";
import { speakElevenLabs, DEFAULT_VOICE_IDS } from "@/lib/tts/speech";

export function RoundTable() {
  const {
    session,
    currentSpeakerId,
    isActive,
    streamingContent,
    messages,
    waitingForHuman,
    ttsEnabled,
    speechRate,
    setSpeakingTTS,
    setMouthOpen,
    signalReady,
  } = useDiscussion();

  const lastSpokenRef = useRef<string | null>(null);
  const cancelTTSRef = useRef<(() => void) | null>(null);

  // Auto-speak completed messages with ElevenLabs
  useEffect(() => {
    if (!session) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.id === lastSpokenRef.current) return;
    lastSpokenRef.current = lastMsg.id;

    // Find seat index and participant
    const seatIndex = session.config.participants.findIndex(
      (p) => p.id === lastMsg.participantId
    );
    if (seatIndex < 0) return;
    const participant = session.config.participants[seatIndex]!;

    // Don't TTS human messages
    if (participant.isHuman) {
      // Signal ready immediately for human turns
      setTimeout(() => signalReady(), 500);
      return;
    }

    if (!ttsEnabled) {
      // signalReady is handled by the store's await:ready handler
      return;
    }

    // Cancel any ongoing TTS
    cancelTTSRef.current?.();

    const voiceId = participant.voiceId || DEFAULT_VOICE_IDS[seatIndex] || DEFAULT_VOICE_IDS[0]!;

    setSpeakingTTS(lastMsg.participantId);

    let mouthToggle = false;
    cancelTTSRef.current = speakElevenLabs(lastMsg.content, voiceId, (event) => {
      if (event === "boundary") {
        mouthToggle = !mouthToggle;
        setMouthOpen(lastMsg.participantId, mouthToggle);
      }
      if (event === "end") {
        setSpeakingTTS(null);
        setMouthOpen(lastMsg.participantId, false);
        // TTS finished — signal server to proceed
        signalReady();
      }
    }, speechRate);
  }, [messages, ttsEnabled, speechRate, session, setSpeakingTTS, setMouthOpen, signalReady]);

  // Cancel TTS when discussion stops
  useEffect(() => {
    if (!isActive) {
      cancelTTSRef.current?.();
      cancelTTSRef.current = null;
    }
  }, [isActive]);

  if (!session) return null;

  const { participants } = session.config;
  // Filter out chair for seat positioning — chair sits separately
  const seatParticipants = participants.filter((p) => !p.isChair);
  const chairParticipant = participants.find((p) => p.isChair);

  const tableSize = Math.min(600, Math.max(400, seatParticipants.length * 100));
  const radius = tableSize / 2;

  const humanParticipant = waitingForHuman
    ? participants.find((p) => p.id === currentSpeakerId && p.isHuman)
    : null;

  return (
    <div className="relative" style={{ width: tableSize, height: tableSize + (chairParticipant ? 60 : 0) }}>
      {/* Chair position — top center, inside the table edge */}
      {chairParticipant && (() => {
        const isSpeaking =
          currentSpeakerId === chairParticipant.id && isActive && !waitingForHuman;
        const streamText = streamingContent[chairParticipant.id];
        const lastMessage = [...messages]
          .reverse()
          .find((m) => m.participantId === chairParticipant.id);

        return (
          <>
            <ParticipantSeat
              participant={chairParticipant}
              isSpeaking={isSpeaking}
              x={radius}
              y={20}
            />
            {(isSpeaking && streamText) || (!isSpeaking && lastMessage) ? (
              <MessageBubble
                content={isSpeaking ? streamText ?? "" : lastMessage?.content ?? ""}
                color={chairParticipant.color}
                x={radius}
                y={20}
                tableSize={tableSize}
                isStreaming={isSpeaking}
              />
            ) : null}
          </>
        );
      })()}

      {/* Felt table */}
      <div
        className="absolute rounded-full felt-bg border-8 border-amber-900/60 shadow-2xl"
        style={{
          top: chairParticipant ? 60 : 0,
          left: 0,
          width: tableSize,
          height: tableSize,
          boxShadow:
            "inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.5)",
        }}
      />

      {/* Gold rim */}
      <div
        className="absolute rounded-full border border-gold/30"
        style={{
          top: chairParticipant ? 64 : 4,
          left: 4,
          width: tableSize - 8,
          height: tableSize - 8,
        }}
      />

      {/* Center content — offset for chair */}
      <div
        className="absolute"
        style={{
          top: chairParticipant ? 60 : 0,
          left: 0,
          width: tableSize,
          height: tableSize,
        }}
      >
        <TableCenter />
      </div>

      {/* Panelists positioned around the table */}
      {seatParticipants.map((participant, index) => {
        const angle = (index / seatParticipants.length) * 2 * Math.PI - Math.PI / 2;
        const seatRadius = radius + 60;
        const tableOffset = chairParticipant ? 60 : 0;
        const x = Math.cos(angle) * seatRadius + radius;
        const y = Math.sin(angle) * seatRadius + radius + tableOffset;

        const isSpeaking =
          currentSpeakerId === participant.id && isActive && !waitingForHuman;
        const streamText = streamingContent[participant.id];
        const lastMessage = [...messages]
          .reverse()
          .find((m) => m.participantId === participant.id);

        return (
          <div key={participant.id}>
            <ParticipantSeat
              participant={participant}
              isSpeaking={isSpeaking}
              x={x}
              y={y}
            />
            {(isSpeaking && streamText) || (!isSpeaking && lastMessage) ? (
              <MessageBubble
                content={isSpeaking ? streamText ?? "" : lastMessage?.content ?? ""}
                color={participant.color}
                x={x}
                y={y}
                tableSize={tableSize}
                isStreaming={isSpeaking}
              />
            ) : null}
          </div>
        );
      })}

      {/* Human input overlay */}
      {humanParticipant && (
        <HumanInput
          participantName={humanParticipant.name}
          color={humanParticipant.color}
        />
      )}
    </div>
  );
}
