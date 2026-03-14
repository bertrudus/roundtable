"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDiscussion } from "@/hooks/useDiscussion";

function exportToPDF(topic: string, summary: string | null, messages: { participantName: string; content: string; turnNumber: number }[]) {
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Roundtable — ${topic}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
  .summary { background: #f0f4ff; border-left: 4px solid #0A84FF; padding: 16px 20px; border-radius: 8px; margin-bottom: 32px; }
  .summary h2 { font-size: 14px; color: #0A84FF; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary p { font-size: 14px; line-height: 1.6; margin: 0; }
  .message { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
  .message:last-child { border-bottom: none; }
  .speaker { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .turn { font-size: 11px; color: #999; margin-left: 8px; }
  .content { font-size: 14px; line-height: 1.6; color: #333; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>${topic}</h1>
<p class="meta">Roundtable Discussion — ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
${summary ? `<div class="summary"><h2>Summary</h2><p>${summary}</p></div>` : ""}
${messages.map((m) => `<div class="message">
  <div class="speaker">${m.participantName}<span class="turn">#${m.turnNumber}</span></div>
  <div class="content">${m.content}</div>
</div>`).join("\n")}
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

export function TranscriptPanel() {
  const { session, messages, streamingContent, currentSpeakerId, summary, isActive } =
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

  const canExport = messages.length > 0 && !isActive;

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
                Summary
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canExport && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToPDF(session.config.topic, summary, messages);
                  }}
                  className="text-[10px] font-medium text-accent hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-accent/20"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  Export PDF
                </span>
              )}
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#0A84FF" strokeWidth="1.5"
                className={`transition-transform ${summaryOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" />
              </svg>
            </div>
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

      {/* Export button when no summary but discussion complete */}
      {canExport && !summary && (
        <div className="mx-3 mb-2">
          <button
            onClick={() => exportToPDF(session.config.topic, null, messages)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/[0.08] hover:bg-accent/[0.12] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0A84FF" strokeWidth="1.5">
              <path d="M7 1v9M3 6l4 4 4-4M2 12h10" />
            </svg>
            <span className="text-[12px] font-semibold text-accent" style={{ fontFamily: "var(--font-ui)" }}>
              Export PDF
            </span>
          </button>
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
