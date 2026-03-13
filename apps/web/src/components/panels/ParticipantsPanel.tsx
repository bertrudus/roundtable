"use client";

import { useState } from "react";
import { useDiscussionStore } from "@/stores/discussionStore";
import { PERSONAS, type Persona } from "@/lib/personas";
import { DEFAULT_VOICE_IDS } from "@/lib/tts/speech";
import { PARTICIPANT_COLORS } from "@roundtable/shared";
import { nanoid } from "nanoid";
import type { ParticipantConfig } from "@roundtable/shared";

export function ParticipantsPanel() {
  const { session, isActive, addParticipantLive, removeParticipantLive } =
    useDiscussionStore();
  const [showPersonas, setShowPersonas] = useState(false);

  if (!session) return null;

  const { participants } = session.config;

  const addFromPersona = (persona: Persona) => {
    if (participants.length >= 8) return;
    const config: ParticipantConfig = {
      id: nanoid(),
      name: persona.name,
      provider: persona.provider,
      model: persona.model,
      systemPrompt: persona.systemPrompt,
      personality: persona.personality,
      voiceId: persona.voiceId,
      color: persona.color,
    };
    addParticipantLive(config);
    setShowPersonas(false);
  };

  const addHuman = () => {
    if (participants.length >= 8) return;
    if (participants.some((p) => p.isHuman)) return;
    const idx = participants.length;
    addParticipantLive({
      id: nanoid(),
      name: "You",
      provider: "openai",
      model: "gpt-5.4",
      systemPrompt: "Human participant",
      color: PARTICIPANT_COLORS[idx] ?? "#888",
      isHuman: true,
    });
  };

  const usedPersonaNames = new Set(participants.map((p) => p.name));
  const availablePersonas = PERSONAS.filter((p) => !usedPersonaNames.has(p.name));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="label-mono">
          {participants.length} participant{participants.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
          {!participants.some((p) => p.isHuman) && (
            <button
              onClick={addHuman}
              disabled={participants.length >= 8}
              className="btn btn-ghost text-[9px] py-1 px-2 disabled:opacity-30"
            >
              + You
            </button>
          )}
          <button
            onClick={() => setShowPersonas(!showPersonas)}
            disabled={participants.length >= 8}
            className="btn btn-primary text-[9px] py-1 px-2 disabled:opacity-30"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Persona picker */}
      {showPersonas && (
        <div className="border-b border-border bg-[#0d0d0d] max-h-64 overflow-y-auto custom-scrollbar">
          {availablePersonas.length === 0 ? (
            <p className="p-4 label-mono-sm text-center">All personas in use</p>
          ) : (
            availablePersonas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => addFromPersona(persona)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors text-left border-b border-border/50 last:border-0"
              >
                <img
                  src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(persona.avatarSeed)}&backgroundColor=transparent&size=28`}
                  alt={persona.name}
                  className="w-7 h-7 rounded-none border border-border"
                  style={{ backgroundColor: persona.color + "11" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-[family-name:var(--font-serif)] text-white">
                      {persona.name}
                    </span>
                    <span className="label-mono-sm" style={{ color: persona.color }}>
                      {persona.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate font-[family-name:var(--font-serif)]">
                    {persona.personality}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {participants.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 group ${
              p.isChair ? "bg-gold/5 border-l-2 border-l-gold/30" : ""
            }`}
          >
            <img
              src={`https://api.dicebear.com/9.x/${p.isHuman ? "adventurer" : "bottts"}/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=transparent&size=28`}
              alt={p.name}
              className="w-7 h-7 rounded-none border border-border"
              style={{ backgroundColor: p.color + "11" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-[family-name:var(--font-serif)] text-white">
                  {p.name}
                </span>
                {p.isChair && (
                  <span className="label-mono-sm text-gold">CHAIR</span>
                )}
                {p.isHuman && (
                  <span className="label-mono-sm text-blue-400">YOU</span>
                )}
              </div>
              <span className="label-mono-sm">
                {p.isChair ? "moderator" : p.isHuman ? "human" : `${p.provider} · ${p.model}`}
              </span>
            </div>
            {!p.isChair && participants.filter((pp) => !pp.isChair).length > 2 && (
              <button
                onClick={() => removeParticipantLive(p.id)}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all text-xs"
                title="Remove"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
