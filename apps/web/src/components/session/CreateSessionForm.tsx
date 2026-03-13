"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
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
} from "@roundtable/shared";

const QUICK_PRESETS = [
  { label: "Debate Club", ids: ["strategist", "devils-advocate", "philosopher"] },
  { label: "Creative Jam", ids: ["optimist", "storyteller", "visionary"] },
  { label: "Reality Check", ids: ["realist", "comedian", "strategist"] },
  { label: "Full Table", ids: ["strategist", "comedian", "philosopher", "optimist", "devils-advocate"] },
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

  useEffect(() => {
    fetchVoices().then(setVoices);
    // Load default preset
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

  const updateParticipant = (id: string, updates: Partial<ParticipantConfig>) => {
    setParticipants(participants.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || submitting || participants.length < 2) return;
    setSubmitting(true);

    // Build final participant list, injecting Chair if enabled
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
      className="w-full max-w-2xl bg-surface border border-border p-6 space-y-6"
    >
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800/50 text-red-400 label-mono">
          {error}
        </div>
      )}

      {/* Topic */}
      <div>
        <label className="label-mono block mb-2">Discussion Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder='e.g. "Should AI systems have rights?"'
          className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-border text-white font-[family-name:var(--font-serif)] text-[15px] placeholder:text-text-muted placeholder:italic focus:outline-none focus:border-felt-light"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="label-mono block mb-2">Context <span className="text-text-muted">(optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional context or framing..."
          rows={2}
          className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-border text-white font-[family-name:var(--font-serif)] text-[14px] placeholder:text-text-muted placeholder:italic focus:outline-none focus:border-felt-light resize-none"
        />
      </div>

      {/* Settings row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label-mono block mb-2">Mode</label>
          <select
            value={turnMode}
            onChange={(e) => setTurnMode(e.target.value as TurnMode)}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-border text-white label-mono focus:outline-none focus:border-felt-light"
          >
            <option value="round-robin">Round Robin</option>
            <option value="open-floor">Open Floor</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="label-mono block mb-2">Length</label>
          <select
            value={responseLength}
            onChange={(e) => setResponseLength(e.target.value as ResponseLength)}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-border text-white label-mono focus:outline-none focus:border-felt-light"
          >
            <option value="brief">Brief (~50w)</option>
            <option value="short">Short (~100w)</option>
            <option value="medium">Medium (~200w)</option>
            <option value="long">Long (~400w)</option>
          </select>
        </div>
        <div className="w-20">
          <label className="label-mono block mb-2">Turns</label>
          <input
            type="number"
            value={maxTurns}
            onChange={(e) => setMaxTurns(Number(e.target.value))}
            min={2}
            max={100}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-border text-white label-mono focus:outline-none focus:border-felt-light"
          />
        </div>
      </div>

      {/* Chair toggle */}
      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => setEnableChair(!enableChair)}
          className={`w-9 h-5 rounded-full transition-colors relative ${
            enableChair ? "bg-felt-light" : "bg-border"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              enableChair ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>
        <div>
          <span className="label-mono block">Moderator (Chair)</span>
          <span className="label-mono-sm">AI chair introduces topic, ensures everyone speaks, and provides a wrap-up summary</span>
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <label className="label-mono block mb-2">Quick Presets</label>
        <div className="flex gap-2 flex-wrap">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.ids)}
              className="btn btn-ghost text-[9px] py-1.5 px-3"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="label-mono">
            Panel · {participants.length}/8
          </label>
          <div className="flex gap-1">
            {!participants.some((p) => p.isHuman) && (
              <button type="button" onClick={addHuman} disabled={participants.length >= 8} className="btn btn-ghost text-[9px] py-1 px-2 disabled:opacity-30">
                + You
              </button>
            )}
            <button type="button" onClick={() => setShowCustomAdd(!showCustomAdd)} disabled={participants.length >= 8} className="btn btn-ghost text-[9px] py-1 px-2 disabled:opacity-30">
              + Persona
            </button>
          </div>
        </div>

        {/* Persona picker */}
        {showCustomAdd && availablePersonas.length > 0 && (
          <div className="mb-3 border border-border bg-[#0d0d0d] max-h-48 overflow-y-auto custom-scrollbar">
            {availablePersonas.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => { addPersona(persona); setShowCustomAdd(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-raised transition-colors text-left border-b border-border/50 last:border-0"
              >
                <img
                  src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(persona.avatarSeed)}&backgroundColor=transparent&size=24`}
                  alt={persona.name}
                  className="w-6 h-6 border border-border"
                  style={{ backgroundColor: persona.color + "11" }}
                />
                <span className="text-[13px] font-[family-name:var(--font-serif)] text-white">{persona.name}</span>
                <span className="label-mono-sm" style={{ color: persona.color }}>{persona.role}</span>
              </button>
            ))}
          </div>
        )}

        {/* Participant list */}
        <div className="space-y-1">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#0d0d0d] border border-border/50 group">
              <img
                src={`https://api.dicebear.com/9.x/${p.isHuman ? "adventurer" : "bottts"}/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=transparent&size=24`}
                alt={p.name}
                className="w-6 h-6 border border-border"
                style={{ backgroundColor: p.color + "11" }}
              />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-[13px] font-[family-name:var(--font-serif)] text-white">{p.name}</span>
                {p.isHuman ? (
                  <span className="label-mono-sm text-blue-400">Human</span>
                ) : (
                  <span className="label-mono-sm">{p.provider} · {p.model.split("-").slice(-1)[0]}</span>
                )}
                {p.personality && (
                  <span className="label-mono-sm truncate hidden sm:inline">{p.personality}</span>
                )}
              </div>

              {/* Voice select */}
              {!p.isHuman && voices.length > 0 && (
                <select
                  value={p.voiceId || ""}
                  onChange={(e) => updateParticipant(p.id, { voiceId: e.target.value || undefined })}
                  className="w-28 px-1.5 py-1 bg-[#0a0a0a] border border-border text-[9px] font-[family-name:var(--font-mono)] uppercase text-text-secondary focus:outline-none"
                >
                  <option value="">Default</option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              )}

              {participants.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeParticipant(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!topic.trim() || submitting || participants.length < 2}
        className="btn btn-primary w-full py-3 disabled:opacity-30"
      >
        {submitting ? "Creating..." : "Start Roundtable"}
      </button>
    </form>
  );
}
