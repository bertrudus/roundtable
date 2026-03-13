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
  const displayText = content.length > 140 ? "..." + content.slice(-140) : content;

  // Position bubble to the side of the participant
  const center = tableSize / 2;
  const isLeft = x < center - 40;
  const isRight = x > center + 40;

  let bubbleStyle: React.CSSProperties;
  if (isLeft) {
    bubbleStyle = { left: x + 44, top: y - 16 };
  } else if (isRight) {
    bubbleStyle = { right: tableSize - x + 44, top: y - 16 };
  } else {
    bubbleStyle = { left: x, top: y + 50, transform: "translateX(-50%)" };
  }

  return (
    <motion.div
      className="absolute z-20 w-[280px] pointer-events-none"
      style={bubbleStyle}
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div
        className="glass rounded-xl px-4 py-3 text-[12px] leading-relaxed break-words"
        style={{
          fontFamily: "var(--font-serif)",
          color: "rgba(255,255,255,0.9)",
          borderLeft: `3px solid ${color}`,
        }}
      >
        {displayText}
        {isStreaming && (
          <motion.span
            className="inline-block w-[2px] h-3.5 ml-1 rounded-full"
            style={{ backgroundColor: color }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}
