import type { AIProvider } from "@roundtable/shared";
import type { AIProviderAdapter } from "./types";
import { OpenAIAdapter } from "./openai-adapter";
import { AnthropicAdapter } from "./anthropic-adapter";
import { GeminiAdapter } from "./gemini-adapter";

const adapterCache = new Map<string, AIProviderAdapter>();

export function getProviderAdapter(provider: AIProvider): AIProviderAdapter {
  const cached = adapterCache.get(provider);
  if (cached) return cached;

  let adapter: AIProviderAdapter;

  switch (provider) {
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OPENAI_API_KEY not configured");
      adapter = new OpenAIAdapter(key);
      break;
    }
    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
      adapter = new AnthropicAdapter(key);
      break;
    }
    case "gemini": {
      const key = process.env.GOOGLE_AI_API_KEY;
      if (!key) throw new Error("GOOGLE_AI_API_KEY not configured");
      adapter = new GeminiAdapter(key);
      break;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  adapterCache.set(provider, adapter);
  return adapter;
}
