"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useDiscussionStore } from "@/stores/discussionStore";
import { PERSONAS, type Persona } from "@/lib/personas";
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
    addParticipantLive({
      id: nanoid(),
      name: persona.name,
      provider: persona.provider,
      model: persona.model,
      systemPrompt: persona.systemPrompt,
      personality: persona.personality,
      voiceId: persona.voiceId,
      color: persona.color,
    });
    setShowPersonas(false);
  };

  const addHuman = () => {
    if (participants.length >= 8 || participants.some((p) => p.isHuman)) return;
    addParticipantLive({
      id: nanoid(),
      name: "You",
      provider: "openai",
      model: "gpt-5.4",
      systemPrompt: "Human participant",
      color: PARTICIPANT_COLORS[participants.length] ?? "#888",
      isHuman: true,
    });
  };

  const usedPersonaNames = new Set(participants.map((p) => p.name));
  const availablePersonas = PERSONAS.filter((p) => !usedPersonaNames.has(p.name));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-secondary" style={{ fontFamily: "var(--font-ui)" }}>
          {participants.length} participant{participants.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1.5">
          {!participants.some((p) => p.isHuman) && (
            <button onClick={addHuman} disabled={participants.length >= 8} className="btn btn-ghost text-[11px] py-1.5 px-3 disabled:opacity-30">
              + You
            </button>
          )}
          <button onClick={() => setShowPersonas(!showPersonas)} disabled={participants.length >= 8} className="btn btn-primary text-[11px] py-1.5 px-3 disabled:opacity-30">
            + Add
          </button>
        </div>
      </div>

      {/* Persona picker */}
      {showPersonas && (
        <div className="mx-3 mb-2 rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] max-h-64 overflow-y-auto custom-scrollbar">
          {availablePersonas.length === 0 ? (
            <p className="p-4 text-center text-[12px] text-text-muted" style={{ fontFamily: "var(--font-ui)" }}>All personas in use</p>
          ) : (
            availablePersonas.map((persona) => {
              const seed = encodeURIComponent(persona.avatarSeed);
              return (
                <button
                  key={persona.id}
                  onClick={() => addFromPersona(persona)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.04] last:border-0"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: `${persona.color}15`, border: `1px solid ${persona.color}33` }}
                  >
                    <img src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}&backgroundColor=transparent`} alt="" className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-white" style={{ fontFamily: "var(--font-ui)" }}>
                        {persona.name}
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: persona.color }}>{persona.role}</span>
                    </div>
                    <p className="text-[11px] text-text-muted truncate" style={{ fontFamily: "var(--font-ui)" }}>
                      {persona.personality}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
        {participants.map((p) => {
          const seed = encodeURIComponent(p.name);
          const avatarStyle = p.isHuman ? "adventurer" : p.isChair ? "identicon" : "notionists-neutral";

          return (
            <motion.div
              key={p.id}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl group transition-colors ${
                p.isChair ? "bg-gold/[0.05]" : "hover:bg-white/[0.02]"
              }`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                style={{ background: `${p.color}15`, border: `1.5px solid ${p.color}44` }}
              >
                <img src={`https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=transparent`} alt="" className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-white" style={{ fontFamily: "var(--font-ui)" }}>
                    {p.name}
                  </span>
                  {p.isChair && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gold/10 text-gold">CHAIR</span>
                  )}
                  {p.isHuman && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">YOU</span>
                  )}
                </div>
                <span className="text-[11px] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
                  {p.isChair ? "moderator" : p.isHuman ? "human" : `${p.provider} · ${p.model}`}
                </span>
              </div>
              {!p.isChair && participants.filter((pp) => !pp.isChair).length > 2 && (
                <button
                  onClick={() => removeParticipantLive(p.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent-red/20 text-text-muted hover:text-accent-red transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 1l8 8M9 1l-8 8" />
                  </svg>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
