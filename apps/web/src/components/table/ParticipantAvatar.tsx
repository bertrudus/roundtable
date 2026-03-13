"use client";

import { useState } from "react";

interface ParticipantAvatarProps {
  name: string;
  color: string;
  size?: number;
  isSpeaking: boolean;
  mouthOpen?: boolean;
  isHuman?: boolean;
  isChair?: boolean;
}

export function ParticipantAvatar({
  name,
  color,
  size = 64,
  isSpeaking,
  mouthOpen = false,
  isHuman,
  isChair,
}: ParticipantAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const seed = encodeURIComponent(name);
  const style = isHuman ? "adventurer" : isChair ? "identicon" : "notionists-neutral";
  const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=transparent`;

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const imgSize = Math.round(size * 0.7);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow ring behind avatar when speaking */}
      {isSpeaking && (
        <div
          className="absolute inset-[-4px] rounded-full speaking-glow"
          style={{
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Avatar circle */}
      <div
        className={`relative w-full h-full rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 ${
          isSpeaking ? "scale-110" : ""
        }`}
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}08)`,
          boxShadow: isSpeaking
            ? `0 0 24px ${color}44, inset 0 0 12px ${color}11`
            : `0 2px 8px rgba(0,0,0,0.3)`,
          "--pulse-color": `${color}44`,
        } as React.CSSProperties}
      >
        {/* Ring */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            isSpeaking ? "speaking-pulse" : ""
          }`}
          style={{
            border: isSpeaking ? `2.5px solid ${color}` : `1.5px solid ${color}44`,
            "--pulse-color": `${color}44`,
          } as React.CSSProperties}
        />

        {!imgError ? (
          <img
            src={avatarUrl}
            alt={name}
            width={imgSize}
            height={imgSize}
            className="object-contain relative z-10"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className="text-white font-semibold relative z-10"
            style={{ fontSize: size * 0.3 }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Lip-sync mouth overlay */}
      {isSpeaking && (
        <svg
          className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 transition-all duration-75"
          width={size * 0.28}
          height={size * 0.16}
          viewBox="0 0 16 10"
        >
          {mouthOpen ? (
            <ellipse cx="8" cy="5" rx="5" ry="4" fill="#111" stroke={color} strokeWidth="0.5" />
          ) : (
            <ellipse cx="8" cy="5" rx="4" ry="1.5" fill="#111" stroke={color} strokeWidth="0.5" />
          )}
        </svg>
      )}
    </div>
  );
}
