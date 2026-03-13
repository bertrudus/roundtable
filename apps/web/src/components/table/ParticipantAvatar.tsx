"use client";

import { useEffect, useState } from "react";

interface ParticipantAvatarProps {
  name: string;
  color: string;
  isSpeaking: boolean;
  mouthOpen?: boolean;
  isHuman?: boolean;
}

export function ParticipantAvatar({
  name,
  color,
  isSpeaking,
  mouthOpen = false,
  isHuman,
}: ParticipantAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const seed = encodeURIComponent(name);
  const style = isHuman ? "adventurer" : "bottts";
  const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=transparent`;

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 overflow-hidden ${
        isSpeaking ? "speaking-pulse scale-110" : ""
      }`}
      style={{
        backgroundColor: color + "22",
        borderColor: isSpeaking ? color : color + "66",
        boxShadow: isSpeaking ? `0 0 20px ${color}44` : "none",
      }}
    >
      {!imgError ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-11 h-11 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white font-bold text-sm">{initials}</span>
      )}

      {/* Lip-sync mouth overlay */}
      <svg
        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 transition-all duration-75"
        width="16"
        height="10"
        viewBox="0 0 16 10"
        style={{ opacity: isSpeaking ? 1 : 0 }}
      >
        {mouthOpen ? (
          <ellipse cx="8" cy="5" rx="5" ry="4" fill="#1a1a1a" stroke={color} strokeWidth="0.5" />
        ) : (
          <ellipse cx="8" cy="5" rx="4" ry="1.5" fill="#1a1a1a" stroke={color} strokeWidth="0.5" />
        )}
      </svg>
    </div>
  );
}
