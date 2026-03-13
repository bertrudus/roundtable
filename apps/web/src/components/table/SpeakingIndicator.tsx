"use client";

import { motion } from "framer-motion";

interface SpeakingIndicatorProps {
  color: string;
}

export function SpeakingIndicator({ color }: SpeakingIndicatorProps) {
  return (
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-[3px] items-end">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            backgroundColor: color,
            width: 3,
          }}
          animate={{
            height: [3, 10 + Math.random() * 4, 3],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
