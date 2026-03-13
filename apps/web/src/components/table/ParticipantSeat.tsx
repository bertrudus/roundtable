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

  return (
    <motion.div
      className="absolute flex flex-col items-center gap-0.5"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
    >
      <div className="relative">
        <ParticipantAvatar
          name={participant.name}
          color={participant.color}
          isSpeaking={isSpeaking || isTTSSpeaking}
          mouthOpen={mouthOpen}
          isHuman={participant.isHuman}
        />
        {(isSpeaking || isTTSSpeaking) && <SpeakingIndicator color={participant.color} />}
      </div>
      <span className="font-[family-name:var(--font-serif)] text-[12px] text-white/80 whitespace-nowrap mt-1">
        {participant.name}
      </span>
      <span className="label-mono-sm" style={{ color: participant.color + "aa" }}>
        {participant.isChair ? "chair" : participant.isHuman ? "you" : participant.provider}
      </span>
    </motion.div>
  );
}
