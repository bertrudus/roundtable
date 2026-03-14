"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import { useDiscussionStore } from "@/stores/discussionStore";
import { PROVIDERS, PARTICIPANT_COLORS } from "@roundtable/shared";
import { PERSONAS, CHAIR_PERSONA, type Persona } from "@/lib/personas";
import { fetchVoices, DEFAULT_VOICE_IDS } from "@/lib/tts/speech";
import type { ElevenLabsVoice } from "@/lib/tts/speech";
import type {
  ParticipantConfig,
  SessionConfig,
  AIProvider,
  TurnMode,
  ResponseLength,
  DiscussionQuality,
} from "@roundtable/shared";

const QUICK_PRESETS = [
  { label: "Debate Club", ids: ["strategist", "devils-advocate", "philosopher"], emoji: "🎯" },
  { label: "Creative Jam", ids: ["optimist", "storyteller", "visionary"], emoji: "🎨" },
  { label: "Reality Check", ids: ["realist", "comedian", "strategist"], emoji: "📊" },
  { label: "Full Table", ids: ["strategist", "comedian", "philosopher", "optimist", "devils-advocate"], emoji: "🎪" },
];

export function CreateSessionForm() {
  const { createSession, error } = useDiscussionStore();
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [turnMode, setTurnMode] = useState<TurnMode>("round-robin");
  const [maxTurns, setMaxTurns] = useState(12);
  const [responseLength, setResponseLength] = useState<ResponseLength>("short");
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [participants, setParticipants] = useState<ParticipantConfig[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomAdd, setShowCustomAdd] = useState(false);
  const [enableChair, setEnableChair] = useState(true);
  const [discussionQuality, setDiscussionQuality] = useState<DiscussionQuality>("balanced");

  useEffect(() => {
    fetchVoices().then(setVoices);
    applyPreset(QUICK_PRESETS[0]!.ids);
  }, []);

  const applyPreset = (personaIds: string[]) => {
    const configs: ParticipantConfig[] = personaIds
      .map((id) => PERSONAS.find((p) => p.id === id))
      .filter((p): p is Persona => !!p)
      .map((p) => ({
        id: nanoid(),
        name: p.name,
        provider: p.provider,
        model: p.model,
        systemPrompt: p.systemPrompt,
        personality: p.personality,
        voiceId: p.voiceId,
        color: p.color,
      }));
    setParticipants(configs);
  };

  const addPersona = (persona: Persona) => {
    if (participants.length >= 8) return;
    setParticipants([
      ...participants,
      {
        id: nanoid(),
        name: persona.name,
        provider: persona.provider,
        model: persona.model,
        systemPrompt: persona.systemPrompt,
        personality: persona.personality,
        voiceId: persona.voiceId,
        color: persona.color,
      },
    ]);
  };

  const addHuman = () => {
    if (participants.length >= 8) return;
    if (participants.some((p) => p.isHuman)) return;
    const idx = participants.length;
    setParticipants([
      ...participants,
      {
        id: nanoid(),
        name: "You",
        provider: "openai",
        model: "gpt-5.4",
        systemPrompt: "Human participant",
        color: PARTICIPANT_COLORS[idx] ?? "#888",
        isHuman: true,
      },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) return;
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || submitting || participants.length < 2) return;
    setSubmitting(true);

    const finalParticipants = [...participants];
    if (enableChair) {
      finalParticipants.unshift({
        id: nanoid(),
        name: CHAIR_PERSONA.name,
        provider: CHAIR_PERSONA.provider,
        model: CHAIR_PERSONA.model,
        systemPrompt: CHAIR_PERSONA.systemPrompt,
        personality: CHAIR_PERSONA.personality,
        voiceId: CHAIR_PERSONA.voiceId,
        color: CHAIR_PERSONA.color,
        isChair: true,
      });
    }

    await createSession({
      topic: topic.trim(),
      description: description.trim() || undefined,
      turnMode,
      maxTurns,
      responseLength,
      discussionQuality,
      enableChair,
      participants: finalParticipants,
    });
    setSubmitting(false);
  };

  const usedNames = new Set(participants.map((p) => p.name));
  const availablePersonas = PERSONAS.filter((p) => !usedNames.has(p.name));

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl glass rounded-2xl p-6 space-y-5"
    >
      {error && (
        <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-[13px]" style={{ fontFamily: "var(--font-ui)" }}>
          {error}
        </div>
      )}

      {/* Topic */}
      <div>
        <label className="text-[12px] font-medium text-text-secondary block mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          Discussion Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder='e.g. "Should AI systems have rights?"'
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[15px] placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all"
          style={{ fontFamily: "var(--font-serif)" }}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[12px] font-medium text-text-secondary block mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          Context <span className="text-text-muted">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional context or framing..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[14px] placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all resize-none"
          style={{ fontFamily: "var(--font-serif)" }}
        />
      </div>

      {/* Settings row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-text-muted block mb-1.5" style={{ fontFamily: "var(--font-ui)" }}>Mode</label>
          <select
            value={turnMode}
            onChange={(e) => setTurnMode(e.target.value as TurnMode)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] focus:outline-none"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <option value="round-robin">Round Robin</option>
            <option value="open-floor">Open Floor</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-medium text-text-muted block mb-1.5" style={{ fontFamily: "var(--font-ui)" }}>Length</label>
          <select
            value={responseLength}
            onChange={(e) => setResponseLength(e.target.value as ResponseLength)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] focus:outline-none"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <option value="brief">Brief</option>
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
        <div className="w-20">
          <label className="text-[11px] font-medium text-text-muted block mb-1.5" style={{ fontFamily: "var(--font-ui)" }}>Turns</label>
          <input
            type="number"
            value={maxTurns}
            onChange={(e) => setMaxTurns(Number(e.target.value))}
            min={2}
            max={100}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] focus:outline-none tabular-nums"
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </div>
      </div>

      {/* Quality mode */}
      <div>
        <label className="text-[12px] font-medium text-text-secondary block mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          Discussion Quality
        </label>
        <div className="flex p-1 rounded-xl bg-white/[0.04]">
          {([
            { id: "fast" as const, label: "Fast", desc: "Low-latency, ~10x cheaper" },
            { id: "balanced" as const, label: "Balanced", desc: "Default models" },
            { id: "quality" as const, label: "Quality", desc: "Premium, deeper thinking" },
          ]).map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setDiscussionQuality(tier.id)}
              className={`flex-1 py-2.5 px-2 rounded-lg text-center transition-all ${
                discussionQuality === tier.id
                  ? "bg-accent/20 text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="text-[12px] font-semibold block" style={{ fontFamily: "var(--font-ui)" }}>
                {tier.label}
              </span>
              <span className="text-[9px] block mt-0.5" style={{ fontFamily: "var(--font-ui)" }}>
                {tier.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chair toggle */}
      <div className="flex items-center gap-3 py-1">
        <div
          className={`toggle-track ${enableChair ? "active" : ""}`}
          onClick={() => setEnableChair(!enableChair)}
        >
          <div className="toggle-thumb" />
        </div>
        <div>
          <span className="text-[13px] font-medium text-text-primary block" style={{ fontFamily: "var(--font-ui)" }}>
            Moderator
          </span>
          <span className="text-[11px] text-text-muted" style={{ fontFamily: "var(--font-ui)" }}>
            AI chair introduces, mediates, and summarizes
          </span>
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <label className="text-[11px] font-medium text-text-muted block mb-2" style={{ fontFamily: "var(--font-ui)" }}>Quick Presets</label>
        <div className="flex gap-2 flex-wrap">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.ids)}
              className="btn btn-ghost text-[12px] py-2 px-4"
            >
              {preset.emoji} {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[12px] font-medium text-text-secondary" style={{ fontFamily: "var(--font-ui)" }}>
            Panel ({participants.length}/8)
          </label>
          <div className="flex gap-1.5">
            {!participants.some((p) => p.isHuman) && (
              <button type="button" onClick={addHuman} disabled={participants.length >= 8} className="btn btn-ghost text-[11px] py-1.5 px-3 disabled:opacity-30">
                + You
              </button>
            )}
            <button type="button" onClick={() => setShowCustomAdd(!showCustomAdd)} disabled={participants.length >= 8} className="btn btn-ghost text-[11px] py-1.5 px-3 disabled:opacity-30">
              + Persona
            </button>
          </div>
        </div>

        {/* Persona picker */}
        {showCustomAdd && availablePersonas.length > 0 && (
          <div className="mb-3 rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] max-h-48 overflow-y-auto custom-scrollbar">
            {availablePersonas.map((persona) => {
              const seed = encodeURIComponent(persona.avatarSeed);
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => { addPersona(persona); setShowCustomAdd(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.04] last:border-0"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: `${persona.color}15`, border: `1px solid ${persona.color}33` }}
                  >
                    <img src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}&backgroundColor=transparent`} alt="" className="w-5 h-5" />
                  </div>
                  <span className="text-[14px] text-white" style={{ fontFamily: "var(--font-serif)" }}>{persona.name}</span>
                  <span className="text-[10px] font-medium" style={{ fontFamily: "var(--font-ui)", color: persona.color }}>{persona.role}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Participant list */}
        <div className="space-y-1.5">
          {participants.map((p) => {
            const seed = encodeURIComponent(p.name);
            const avatarStyle = p.isHuman ? "adventurer" : "notionists-neutral";
            return (
              <motion.div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] group"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                  style={{ background: `${p.color}15`, border: `1px solid ${p.color}33` }}
                >
                  <img src={`https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=transparent`} alt="" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white" style={{ fontFamily: "var(--font-ui)" }}>{p.name}</span>
                  {p.isHuman ? (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">YOU</span>
                  ) : (
                    <span className="text-[10px] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>{p.provider}</span>
                  )}
                </div>

                {participants.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent-red/20 text-text-muted hover:text-accent-red transition-all"
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

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={!topic.trim() || submitting || participants.length < 2}
        className="btn btn-primary w-full py-3.5 text-[14px] disabled:opacity-30"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        {submitting ? "Creating..." : "Start Roundtable"}
      </motion.button>
    </form>
  );
}
