"use client";

import { motion } from "framer-motion";

interface SpeakingIndicatorProps {
  color: string;
}

export function SpeakingIndicator({ color }: SpeakingIndicatorProps) {
  return (
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            height: [4, 12, 4],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
