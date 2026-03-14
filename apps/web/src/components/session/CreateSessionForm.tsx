"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "framer-motion";
import { useDiscussionStore } from "@/stores/discussionStore";
import { PARTICIPANT_COLORS } from "@roundtable/shared";
import { PERSONAS, CHAIR_PERSONA, type Persona } from "@/lib/personas";
import { fetchVoices } from "@/lib/tts/speech";
import type { ElevenLabsVoice } from "@/lib/tts/speech";
import type {
  ParticipantConfig,
  TurnMode,
  ResponseLength,
  DiscussionQuality,
  DiscussionMode,
} from "@roundtable/shared";

const QUICK_PRESETS = [
  { label: "Debate Club", ids: ["strategist", "devils-advocate", "philosopher"] },
  { label: "Creative Jam", ids: ["optimist", "storyteller", "visionary"] },
  { label: "Reality Check", ids: ["realist", "comedian", "strategist"] },
  { label: "Full Table", ids: ["strategist", "comedian", "philosopher", "optimist", "devils-advocate"] },
];

export function CreateSessionForm() {
  const { createSession, error } = useDiscussionStore();
  const [step, setStep] = useState<"panel" | "config">("panel");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [turnMode, setTurnMode] = useState<TurnMode>("round-robin");
  const [maxTurns, setMaxTurns] = useState(12);
  const [responseLength, setResponseLength] = useState<ResponseLength>("brief");
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [participants, setParticipants] = useState<ParticipantConfig[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [enableChair, setEnableChair] = useState(true);
  const [discussionQuality, setDiscussionQuality] = useState<DiscussionQuality>("balanced");
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>("debate");

  useEffect(() => {
    fetchVoices().then(setVoices);
  }, []);

  const togglePersona = (persona: Persona) => {
    const existing = participants.find((p) => p.name === persona.name);
    if (existing) {
      if (participants.length <= 2) return;
      setParticipants(participants.filter((p) => p.name !== persona.name));
    } else {
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
    }
  };

  const applyPreset = (ids: string[]) => {
    const configs: ParticipantConfig[] = ids
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

  const addHuman = () => {
    if (participants.length >= 8 || participants.some((p) => p.isHuman)) return;
    setParticipants([
      ...participants,
      {
        id: nanoid(),
        name: "You",
        provider: "openai",
        model: "gpt-5.4",
        systemPrompt: "Human participant",
        color: PARTICIPANT_COLORS[participants.length] ?? "#888",
        isHuman: true,
      },
    ]);
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
      discussionMode,
      enableChair,
      participants: finalParticipants,
    });
    setSubmitting(false);
  };

  const selectedNames = new Set(participants.map((p) => p.name));

  // Step 1: Panel Picker
  if (step === "panel") {
    return (
      <div className="w-full max-w-2xl glass rounded-2xl p-6 space-y-5">
        <div className="text-center mb-2">
          <h2 className="text-[18px] font-semibold text-white" style={{ fontFamily: "var(--font-ui)" }}>
            Build Your Panel
          </h2>
          <p className="text-[13px] text-text-muted mt-1" style={{ fontFamily: "var(--font-ui)" }}>
            Select 2-8 panelists for your discussion
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 flex-wrap justify-center">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.ids)}
              className="btn btn-ghost text-[11px] py-1.5 px-3"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Persona grid */}
        <div className="grid grid-cols-2 gap-2">
          {PERSONAS.map((persona) => {
            const selected = selectedNames.has(persona.name);
            const seed = encodeURIComponent(persona.avatarSeed);
            return (
              <motion.button
                key={persona.id}
                type="button"
                onClick={() => togglePersona(persona)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  selected
                    ? "bg-accent/[0.12] border border-accent/30"
                    : "bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06]"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                  style={{
                    background: `${persona.color}${selected ? "25" : "10"}`,
                    border: `1.5px solid ${persona.color}${selected ? "66" : "33"}`,
                  }}
                >
                  <img
                    src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}&backgroundColor=transparent`}
                    alt=""
                    className="w-7 h-7"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-white" style={{ fontFamily: "var(--font-ui)" }}>
                      {persona.name}
                    </span>
                    <span className="text-[9px] font-medium" style={{ color: persona.color }}>
                      {persona.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted truncate" style={{ fontFamily: "var(--font-ui)" }}>
                    {persona.personality}
                  </p>
                </div>
                {selected && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2">
                      <path d="M1 4l3 3 5-6" />
                    </svg>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Add yourself */}
        {!participants.some((p) => p.isHuman) && (
          <button
            type="button"
            onClick={addHuman}
            className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-[13px] text-text-secondary hover:bg-white/[0.06] transition-colors"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            + Join as participant
          </button>
        )}

        {/* Continue */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[12px] text-text-muted" style={{ fontFamily: "var(--font-ui)" }}>
            {participants.length} selected
          </span>
          <motion.button
            type="button"
            onClick={() => setStep("config")}
            disabled={participants.length < 2}
            className="btn btn-primary px-8 py-2.5 text-[13px] disabled:opacity-30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Next
          </motion.button>
        </div>
      </div>
    );
  }

  // Step 2: Configure
  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl glass rounded-2xl p-6 space-y-5"
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => setStep("panel")}
        className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-white transition-colors"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2L4 6l4 4" />
        </svg>
        Back to panel
      </button>

      {error && (
        <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-[13px]" style={{ fontFamily: "var(--font-ui)" }}>
          {error}
        </div>
      )}

      {/* Topic */}
      <div>
        <label className="text-[12px] font-medium text-text-secondary block mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder='e.g. "Should AI systems have rights?"'
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[15px] placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-all"
          style={{ fontFamily: "var(--font-serif)" }}
          required
          autoFocus
        />
      </div>

      {/* Context */}
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

      {/* Discussion Mode */}
      <div>
        <label className="text-[12px] font-medium text-text-secondary block mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          Mode
        </label>
        <div className="flex p-1 rounded-xl bg-white/[0.04]">
          {([
            { id: "debate" as const, label: "Debate", desc: "Argue positions" },
            { id: "review" as const, label: "Review", desc: "Constructive feedback" },
            { id: "critic" as const, label: "Critic", desc: "Sharp analysis" },
          ]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setDiscussionMode(m.id)}
              className={`flex-1 py-2.5 px-2 rounded-lg text-center transition-all ${
                discussionMode === m.id
                  ? "bg-accent/20 text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="text-[12px] font-semibold block" style={{ fontFamily: "var(--font-ui)" }}>
                {m.label}
              </span>
              <span className="text-[9px] block mt-0.5" style={{ fontFamily: "var(--font-ui)" }}>
                {m.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-text-muted block mb-1.5" style={{ fontFamily: "var(--font-ui)" }}>Response Length</label>
          <div className="flex p-1 rounded-xl bg-white/[0.04]">
            {([
              { id: "verbose" as const, label: "Verbose" },
              { id: "brief" as const, label: "Brief" },
              { id: "expansive" as const, label: "Expansive" },
            ]).map((len) => (
              <button
                key={len.id}
                type="button"
                onClick={() => setResponseLength(len.id)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                  responseLength === len.id
                    ? "bg-white/[0.1] text-white"
                    : "text-text-muted hover:text-text-secondary"
                }`}
                style={{ fontFamily: "var(--font-ui)" }}
              >
                {len.label}
              </button>
            ))}
          </div>
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
        <label className="text-[11px] font-medium text-text-muted block mb-1.5" style={{ fontFamily: "var(--font-ui)" }}>Model Quality</label>
        <div className="flex p-1 rounded-xl bg-white/[0.04]">
          {([
            { id: "fast" as const, label: "Fast" },
            { id: "balanced" as const, label: "Balanced" },
            { id: "quality" as const, label: "Quality" },
          ]).map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setDiscussionQuality(tier.id)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                discussionQuality === tier.id
                  ? "bg-white/[0.1] text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {tier.label}
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
            Moderator — {CHAIR_PERSONA.name}
          </span>
          <span className="text-[11px] text-text-muted" style={{ fontFamily: "var(--font-ui)" }}>
            {CHAIR_PERSONA.personality}
          </span>
        </div>
      </div>

      {/* Selected panel summary */}
      <div className="flex flex-wrap gap-1.5">
        {participants.map((p) => {
          const seed = encodeURIComponent(p.name);
          return (
            <div
              key={p.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
            >
              <img
                src={`https://api.dicebear.com/9.x/${p.isHuman ? "adventurer" : "notionists-neutral"}/svg?seed=${seed}&backgroundColor=transparent`}
                alt=""
                className="w-4 h-4"
              />
              <span className="text-[11px] text-white" style={{ fontFamily: "var(--font-ui)" }}>{p.name}</span>
            </div>
          );
        })}
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
