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

    const seatIndex = session.config.participants.findIndex(
      (p) => p.id === lastMsg.participantId
    );
    if (seatIndex < 0) return;
    const participant = session.config.participants[seatIndex]!;

    if (participant.isHuman) {
      setTimeout(() => signalReady(), 500);
      return;
    }

    if (!ttsEnabled) return;

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
        signalReady();
      }
    }, speechRate);
  }, [messages, ttsEnabled, speechRate, session, setSpeakingTTS, setMouthOpen, signalReady]);

  useEffect(() => {
    if (!isActive) {
      cancelTTSRef.current?.();
      cancelTTSRef.current = null;
    }
  }, [isActive]);

  if (!session) return null;

  const { participants } = session.config;
  const seatParticipants = participants.filter((p) => !p.isChair);
  const chairParticipant = participants.find((p) => p.isChair);

  const tableSize = Math.min(560, Math.max(380, seatParticipants.length * 90));
  const radius = tableSize / 2;
  const totalHeight = tableSize + (chairParticipant ? 80 : 0);

  const humanParticipant = waitingForHuman
    ? participants.find((p) => p.id === currentSpeakerId && p.isHuman)
    : null;

  return (
    <div className="relative" style={{ width: tableSize + 120, height: totalHeight + 60 }}>
      {/* Chair — centered above table */}
      {chairParticipant && (() => {
        const isSpeaking = currentSpeakerId === chairParticipant.id && isActive && !waitingForHuman;
        const streamText = streamingContent[chairParticipant.id];
        const lastMessage = [...messages].reverse().find((m) => m.participantId === chairParticipant.id);

        return (
          <>
            <ParticipantSeat
              participant={chairParticipant}
              isSpeaking={isSpeaking}
              x={(tableSize + 120) / 2}
              y={30}
            />
            {(isSpeaking && streamText) || (!isSpeaking && lastMessage) ? (
              <MessageBubble
                content={isSpeaking ? streamText ?? "" : lastMessage?.content ?? ""}
                color={chairParticipant.color}
                x={(tableSize + 120) / 2}
                y={30}
                tableSize={tableSize + 120}
                isStreaming={isSpeaking}
              />
            ) : null}
          </>
        );
      })()}

      {/* Table surface */}
      <div
        className="absolute rounded-full"
        style={{
          top: chairParticipant ? 80 : 20,
          left: 60,
          width: tableSize,
          height: tableSize,
          background: "radial-gradient(ellipse at center, rgba(20,35,25,0.9) 0%, rgba(10,18,14,0.95) 60%, rgba(5,10,8,1) 100%)",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.5), 0 0 60px rgba(0,0,0,0.4), 0 0 120px rgba(10,132,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      />

      {/* Inner ring */}
      <div
        className="absolute rounded-full"
        style={{
          top: (chairParticipant ? 80 : 20) + 8,
          left: 68,
          width: tableSize - 16,
          height: tableSize - 16,
          border: "1px solid rgba(255,214,10,0.12)",
        }}
      />

      {/* Center content */}
      <div
        className="absolute"
        style={{
          top: chairParticipant ? 80 : 20,
          left: 60,
          width: tableSize,
          height: tableSize,
        }}
      >
        <TableCenter />
      </div>

      {/* Panelists around the table */}
      {seatParticipants.map((participant, index) => {
        const angle = (index / seatParticipants.length) * 2 * Math.PI - Math.PI / 2;
        const seatRadius = radius + 60;
        const tableOffset = chairParticipant ? 80 : 20;
        const xCenter = 60 + radius;
        const yCenter = tableOffset + radius;
        const x = Math.cos(angle) * seatRadius + xCenter;
        const y = Math.sin(angle) * seatRadius + yCenter;

        const isSpeaking = currentSpeakerId === participant.id && isActive && !waitingForHuman;
        const streamText = streamingContent[participant.id];
        const lastMessage = [...messages].reverse().find((m) => m.participantId === participant.id);

        return (
          <div key={participant.id}>
            <ParticipantSeat participant={participant} isSpeaking={isSpeaking} x={x} y={y} />
            {(isSpeaking && streamText) || (!isSpeaking && lastMessage) ? (
              <MessageBubble
                content={isSpeaking ? streamText ?? "" : lastMessage?.content ?? ""}
                color={participant.color}
                x={x}
                y={y}
                tableSize={tableSize + 120}
                isStreaming={isSpeaking}
              />
            ) : null}
          </div>
        );
      })}

      {humanParticipant && (
        <HumanInput
          participantName={humanParticipant.name}
          color={humanParticipant.color}
        />
      )}
    </div>
  );
}
