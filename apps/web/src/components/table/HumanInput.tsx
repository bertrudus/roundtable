"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useDiscussionStore } from "@/stores/discussionStore";

interface HumanInputProps {
  participantName: string;
  color: string;
}

export function HumanInput({ participantName, color }: HumanInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitHumanMessage = useDiscussionStore((s) => s.submitHumanMessage);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    submitHumanMessage(trimmed);
    setText("");
  };

  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-80"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="glass rounded-2xl p-4">
        <p className="text-[12px] font-medium mb-2" style={{ fontFamily: "var(--font-ui)", color }}>
          Your turn, {participantName}
        </p>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type your response..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[14px] text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none"
          style={{ fontFamily: "var(--font-serif)" }}
        />
        <motion.button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="mt-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-30 transition-colors"
          style={{ fontFamily: "var(--font-ui)", backgroundColor: color }}
          whileTap={{ scale: 0.98 }}
        >
          Send
        </motion.button>
      </div>
    </motion.div>
  );
}
