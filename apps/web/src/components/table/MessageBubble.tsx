"use client";

import { motion } from "framer-motion";

interface MessageBubbleProps {
  content: string;
  color: string;
  x: number;
  y: number;
  tableSize: number;
  isStreaming: boolean;
}

export function MessageBubble({
  content,
  color,
  x,
  y,
  tableSize,
  isStreaming,
}: MessageBubbleProps) {
  const displayText = content.length > 120 ? "..." + content.slice(-120) : content;

  // Determine if the bubble is on the left or right half of the table
  const center = tableSize / 2;
  const isLeft = x < center - 30;
  const isRight = x > center + 30;

  // Position bubble to the side of the participant, not below
  let bubbleStyle: React.CSSProperties;
  if (isLeft) {
    bubbleStyle = {
      left: x + 40,
      top: y - 20,
    };
  } else if (isRight) {
    bubbleStyle = {
      right: tableSize - x + 40,
      top: y - 20,
    };
  } else {
    // Top or bottom — position below
    bubbleStyle = {
      left: x,
      top: y + 50,
      transform: "translateX(-50%)",
    };
  }

  return (
    <motion.div
      className="absolute z-20 w-[260px] pointer-events-none"
      style={bubbleStyle}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div
        className="px-3 py-2 text-[11px] font-[family-name:var(--font-serif)] text-text-primary leading-relaxed backdrop-blur-sm border-l-2 break-words"
        style={{
          backgroundColor: "#0a0a0acc",
          borderLeftColor: color,
        }}
      >
        {displayText}
        {isStreaming && (
          <span className="inline-block w-[2px] h-3 bg-felt-light ml-0.5 animate-pulse" />
        )}
      </div>
    </motion.div>
  );
}
