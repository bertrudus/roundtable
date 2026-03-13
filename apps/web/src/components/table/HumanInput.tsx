"use client";

import { useState, useRef, useEffect } from "react";
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
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-80">
      <div
        className="rounded-xl p-3 backdrop-blur-md border"
        style={{
          backgroundColor: "rgba(0,0,0,0.85)",
          borderColor: color + "66",
        }}
      >
        <p className="text-xs mb-2" style={{ color }}>
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
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none"
          style={{ borderColor: color + "44" }}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="mt-2 w-full py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-30 transition-colors"
          style={{ backgroundColor: color + "cc" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
