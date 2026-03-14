"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  return (
    <div className="flex flex-col h-full">
      {/* Summary accordion */}
      {summary && (
        <div className="mx-3 mb-2">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-accent/[0.08] hover:bg-accent/[0.12] transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[12px] font-semibold text-accent" style={{ fontFamily: "var(--font-ui)" }}>
                Chair Summary
              </span>
            </div>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#0A84FF" strokeWidth="1.5"
              className={`transition-transform ${summaryOpen ? "rotate-180" : ""}`}
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
          <AnimatePresence>
            {summaryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p
                  className="text-[13px] leading-relaxed px-4 py-3 text-text-secondary"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {summary}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-1"
      >
        {messages.length === 0 && !currentSpeakerId && (
          <p className="text-center mt-12 text-text-muted text-[13px]" style={{ fontFamily: "var(--font-ui)" }}>
            Waiting for discussion to start...
          </p>
        )}

        {messages.map((msg) => {
          const participant = getParticipant(msg.participantId);
          const isChair = participant?.isChair;
          const seed = encodeURIComponent(msg.participantName);
          const avatarStyle = participant?.isHuman ? "adventurer" : isChair ? "identicon" : "notionists-neutral";
          const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=transparent`;

          return (
            <motion.div
              key={msg.id}
              className={`flex gap-3 p-3 rounded-xl transition-colors ${
                isChair ? "bg-accent/[0.04]" : "hover:bg-white/[0.02]"
              }`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Mini avatar */}
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  background: `${participant?.color ?? "#888"}15`,
                  border: `1px solid ${participant?.color ?? "#888"}33`,
                }}
              >
                <img src={avatarUrl} alt="" className="w-5 h-5 object-contain" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ fontFamily: "var(--font-ui)", color: participant?.color ?? "#888" }}
                  >
                    {msg.participantName}
                  </span>
                  {isChair && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                      CHAIR
                    </span>
                  )}
                  <span className="text-[10px] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
                    #{msg.turnNumber}
                  </span>
                </div>
                <p
                  className="text-[13px] leading-relaxed text-text-secondary"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {msg.content}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Streaming message */}
        {currentSpeakerId && streamingContent[currentSpeakerId] && (() => {
          const participant = getParticipant(currentSpeakerId);
          const seed = encodeURIComponent(participant?.name ?? "");
          const avatarStyle = participant?.isHuman ? "adventurer" : participant?.isChair ? "identicon" : "notionists-neutral";
          const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=transparent`;

          return (
            <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02]">
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden animate-pulse"
                style={{
                  background: `${participant?.color ?? "#888"}15`,
                  border: `1px solid ${participant?.color ?? "#888"}55`,
                }}
              >
                <img src={avatarUrl} alt="" className="w-5 h-5 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ fontFamily: "var(--font-ui)", color: participant?.color ?? "#888" }}
                  >
                    {participant?.name ?? "Unknown"}
                  </span>
                  <motion.span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{ fontFamily: "var(--font-mono)", background: `${participant?.color ?? "#888"}15`, color: participant?.color ?? "#888" }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    SPEAKING
                  </motion.span>
                </div>
                <p
                  className="text-[13px] leading-relaxed text-text-secondary"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {streamingContent[currentSpeakerId]}
                  <motion.span
                    className="inline-block w-[2px] h-3.5 ml-1 rounded-full"
                    style={{ backgroundColor: participant?.color ?? "#888" }}
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
