"use client";

import { useDiscussion } from "@/hooks/useDiscussion";
import { motion } from "framer-motion";
import { warmUpAudio } from "@/lib/tts/speech";

export function TableCenter() {
  const {
    session,
    isActive,
    messages,
    startDiscussion,
    stopDiscussion,
    waitingForHuman,
    isPaused,
    awaitingContinue,
    setPaused,
    continueDiscussion,
  } = useDiscussion();

  if (!session) return null;

  const turnCount = messages.length;

  const handleStart = () => {
    warmUpAudio();
    startDiscussion();
  };

  const handleContinue = () => {
    continueDiscussion();
  };

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
            onClick={handleStart}
            className="btn btn-primary text-[12px] px-6 py-2.5"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start
          </motion.button>
        )}

        {isActive && !waitingForHuman && (
          <div className="flex flex-col items-center gap-2">
            {/* Pause / Resume toggle */}
            <div className="flex gap-2">
              {awaitingContinue ? (
                <motion.button
                  onClick={handleContinue}
                  className="btn btn-primary text-[12px] px-5 py-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  Continue
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => setPaused(!isPaused)}
                  className={`btn text-[12px] px-5 py-2 ${isPaused ? "btn-primary" : "btn-ghost"}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isPaused ? (
                    <span className="flex items-center gap-1.5">
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0l10 6-10 6z" /></svg>
                      Resume
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><rect x="0" y="0" width="3" height="12" /><rect x="7" y="0" width="3" height="12" /></svg>
                      Pause
                    </span>
                  )}
                </motion.button>
              )}
              <motion.button
                onClick={stopDiscussion}
                className="btn btn-danger text-[12px] px-5 py-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Stop
              </motion.button>
            </div>
            {isPaused && !awaitingContinue && (
              <motion.span
                className="text-[10px] font-medium text-accent"
                style={{ fontFamily: "var(--font-ui)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Pausing after this turn...
              </motion.span>
            )}
            {awaitingContinue && (
              <motion.span
                className="text-[10px] font-medium text-accent"
                style={{ fontFamily: "var(--font-ui)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Click Continue when ready
              </motion.span>
            )}
          </div>
        )}

        {session.status === "completed" && (
          <span className="label-mono text-accent">Complete</span>
        )}
      </div>
    </div>
  );
}
