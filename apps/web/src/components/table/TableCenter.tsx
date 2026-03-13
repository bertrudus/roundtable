"use client";

import { useDiscussion } from "@/hooks/useDiscussion";
import { motion } from "framer-motion";

export function TableCenter() {
  const {
    session,
    isActive,
    messages,
    startDiscussion,
    stopDiscussion,
    waitingForHuman,
  } = useDiscussion();

  if (!session) return null;

  const turnCount = messages.length;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto text-center max-w-[200px]">
        <h2
          className="text-[15px] font-semibold mb-1 line-clamp-2 leading-snug"
          style={{
            fontFamily: "var(--font-serif)",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {session.config.topic}
        </h2>
        <p className="label-mono-sm mb-4">
          Turn {turnCount}{session.config.maxTurns ? ` / ${session.config.maxTurns}` : ""}
        </p>

        {!isActive && session.status !== "completed" && (
          <motion.button
            onClick={startDiscussion}
            className="btn btn-primary text-[12px] px-6 py-2.5"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start
          </motion.button>
        )}

        {isActive && !waitingForHuman && (
          <motion.button
            onClick={stopDiscussion}
            className="btn btn-danger text-[12px] px-6 py-2.5"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Stop
          </motion.button>
        )}

        {session.status === "completed" && (
          <span className="label-mono text-accent-green">Complete</span>
        )}
      </div>
    </div>
  );
}
