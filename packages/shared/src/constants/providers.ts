import type { AIProvider } from "../types/provider";

export interface ProviderInfo {
  name: string;
  displayName: string;
  models: { id: string; name: string; contextWindow: number }[];
  defaultModel: string;
}

export const PROVIDERS: Record<AIProvider, ProviderInfo> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4", contextWindow: 128_000 },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", contextWindow: 128_000 },
      { id: "gpt-5.2", name: "GPT-5.2", contextWindow: 128_000 },
      { id: "gpt-5", name: "GPT-5", contextWindow: 128_000 },
      { id: "gpt-5-mini", name: "GPT-5 Mini", contextWindow: 128_000 },
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128_000 },
      { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 128_000 },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 128_000 },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", contextWindow: 128_000 },
    ],
    defaultModel: "gpt-5.4",
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", contextWindow: 200_000 },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextWindow: 200_000 },
      { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", contextWindow: 200_000 },
      { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", contextWindow: 200_000 },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", contextWindow: 200_000 },
    ],
    defaultModel: "claude-sonnet-4-6",
  },
  gemini: {
    name: "gemini",
    displayName: "Google Gemini",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1_048_576 },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1_048_576 },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", contextWindow: 1_048_576 },
    ],
    defaultModel: "gemini-2.5-flash",
  },
};

/**
 * Model tiers by quality mode.
 * "fast"    — optimised for low-latency voice / real-time (~10× cheaper)
 * "balanced" — mid-tier: good quality, reasonable speed
 * "quality" — premium models for deep, thoughtful discussion
 */
export const MODEL_TIERS: Record<string, { fast: string; balanced: string; quality: string }> = {
  openai:    { fast: "gpt-4.1-mini",              balanced: "gpt-4o",             quality: "gpt-5.4" },
  anthropic: { fast: "claude-haiku-4-5-20251001", balanced: "claude-sonnet-4-6",  quality: "claude-sonnet-4-6" },
  gemini:    { fast: "gemini-2.0-flash-lite",     balanced: "gemini-2.5-flash",   quality: "gemini-2.5-pro" },
};

export const CONTEXT_COMPACTION_THRESHOLD = 0.7; // 70% of context window
export const DEFAULT_TURN_MODE = "round-robin" as const;
export const MAX_PARTICIPANTS = 8;
export const MIN_PARTICIPANTS = 2;

export const PARTICIPANT_COLORS = [
  "#EF4444", // red
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];
