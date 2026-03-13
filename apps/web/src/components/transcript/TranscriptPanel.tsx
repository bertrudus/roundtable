"use client";

import { useRef, useEffect, useState } from "react";
import { useDiscussion } from "@/hooks/useDiscussion";

export function TranscriptPanel() {
  const { session, messages, streamingContent, currentSpeakerId, summary } =
    useDiscussion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [summaryOpen, setSummaryOpen] = useState(true);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  if (!session) return null;

  const getParticipant = (id: string) =>
    session.config.participants.find((p) => p.id === id);

  // Group messages by round for visual clarity
  const roundSize = session.config.participants.filter((p) => !p.isChair).length;

  return (
    <div className="flex flex-col h-full">
      {/* Summary accordion */}
      {summary && (
        <div className="border-b border-border">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gold" />
              <span className="label-mono text-gold">Chair Summary</span>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={`text-text-muted transition-transform ${summaryOpen ? "rotate-180" : ""}`}
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
          {summaryOpen && (
            <div className="px-4 pb-4">
              <p className="text-[13px] font-[family-name:var(--font-serif)] text-text-primary leading-relaxed pl-4 border-l-2 border-gold/40">
                {summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3"
      >
        {messages.length === 0 && !currentSpeakerId && (
          <p className="label-mono text-center mt-8">
            Waiting for discussion to start
          </p>
        )}

        {messages.map((msg, idx) => {
          const participant = getParticipant(msg.participantId);
          const isChair = participant?.isChair;

          // Show round divider before first non-chair message of each round
          const showRoundDivider =
            !isChair &&
            roundSize > 0 &&
            idx > 0 &&
            (() => {
              // Count non-chair messages before this one
              const nonChairBefore = messages
                .slice(0, idx)
                .filter((m) => !getParticipant(m.participantId)?.isChair).length;
              return nonChairBefore > 0 && nonChairBefore % roundSize === 0;
            })();

          return (
            <div key={msg.id}>
              {showRoundDivider && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="label-mono-sm">Round {Math.floor(messages.slice(0, idx).filter((m) => !getParticipant(m.participantId)?.isChair).length / roundSize) + 1}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className={`space-y-1 ${isChair ? "bg-gold/5 -mx-2 px-2 py-2 border-l-2 border-gold/30" : ""}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 shrink-0 ${isChair ? "bg-gold" : ""}`}
                    style={{ backgroundColor: isChair ? undefined : participant?.color ?? "#888" }}
                  />
                  <span
                    className="label-mono shrink-0"
                    style={{ color: participant?.color ?? "#888" }}
                  >
                    {msg.participantName}
                    {isChair && <span className="text-gold/60 ml-1">(chair)</span>}
                  </span>
                  <span className="label-mono-sm shrink-0">
                    T{msg.turnNumber}
                  </span>
                </div>
                <p className="text-[13px] font-[family-name:var(--font-serif)] text-text-primary leading-relaxed pl-3.5 border-l border-border">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}

        {/* Streaming message */}
        {currentSpeakerId && streamingContent[currentSpeakerId] && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 animate-pulse shrink-0"
                style={{
                  backgroundColor:
                    getParticipant(currentSpeakerId)?.color ?? "#888",
                }}
              />
              <span
                className="label-mono shrink-0"
                style={{
                  color: getParticipant(currentSpeakerId)?.color ?? "#888",
                }}
              >
                {getParticipant(currentSpeakerId)?.name ?? "Unknown"}
              </span>
              <span className="label-mono-sm animate-pulse shrink-0">Speaking</span>
            </div>
            <p className="text-[13px] font-[family-name:var(--font-serif)] text-text-primary leading-relaxed pl-3.5 border-l border-felt-light/50">
              {streamingContent[currentSpeakerId]}
              <span className="inline-block w-[2px] h-3.5 bg-felt-light ml-0.5 animate-pulse" />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
