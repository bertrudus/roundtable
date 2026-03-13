export type AIProvider = "openai" | "anthropic" | "gemini";

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  defaultModel: string;
  availableModels: string[];
  maxContextTokens: number;
}

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamResponse {
  stream: ReadableStream<string>;
  model: string;
  provider: AIProvider;
}
