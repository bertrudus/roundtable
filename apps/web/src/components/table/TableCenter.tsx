"use client";

import { useDiscussion } from "@/hooks/useDiscussion";

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
      <div className="pointer-events-auto text-center max-w-[180px]">
        <h2 className="font-[family-name:var(--font-serif)] text-gold text-[14px] font-semibold mb-1 line-clamp-2 leading-snug">
          {session.config.topic}
        </h2>
        <p className="label-mono-sm mb-3">
          Turn {turnCount}{session.config.maxTurns ? ` / ${session.config.maxTurns}` : ""}
        </p>

        {!isActive && session.status !== "completed" && (
          <button onClick={startDiscussion} className="btn btn-primary text-[10px] px-5 py-2">
            Start
          </button>
        )}

        {isActive && !waitingForHuman && (
          <button onClick={stopDiscussion} className="btn btn-danger text-[10px] px-5 py-2">
            Stop
          </button>
        )}

        {session.status === "completed" && (
          <span className="label-mono-sm">Complete</span>
        )}
      </div>
    </div>
  );
}
