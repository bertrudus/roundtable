"use client";

import { motion } from "framer-motion";
import type { ParticipantConfig } from "@roundtable/shared";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { SpeakingIndicator } from "./SpeakingIndicator";
import { useDiscussionStore } from "@/stores/discussionStore";

interface ParticipantSeatProps {
  participant: ParticipantConfig;
  isSpeaking: boolean;
  x: number;
  y: number;
}

export function ParticipantSeat({
  participant,
  isSpeaking,
  x,
  y,
}: ParticipantSeatProps) {
  const mouthOpen = useDiscussionStore((s) => s.mouthOpen[participant.id] ?? false);
  const speakingTTS = useDiscussionStore((s) => s.speakingTTS);
  const isTTSSpeaking = speakingTTS === participant.id;
  const speaking = isSpeaking || isTTSSpeaking;

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="relative">
        <ParticipantAvatar
          name={participant.name}
          color={participant.color}
          size={participant.isChair ? 56 : 64}
          isSpeaking={speaking}
          mouthOpen={mouthOpen}
          isHuman={participant.isHuman}
          isChair={participant.isChair}
        />
        {speaking && <SpeakingIndicator color={participant.color} />}
      </div>

      <span
        className="mt-2 text-[13px] font-semibold whitespace-nowrap"
        style={{
          fontFamily: "var(--font-ui)",
          color: speaking ? "#fff" : "rgba(255,255,255,0.7)",
        }}
      >
        {participant.name}
      </span>
      <span
        className="text-[9px] font-medium uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-mono)",
          color: participant.color + (speaking ? "cc" : "66"),
        }}
      >
        {participant.isChair ? "moderator" : participant.isHuman ? "you" : participant.provider}
      </span>
    </motion.div>
  );
}
