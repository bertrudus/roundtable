import type { AIProvider, ProviderMessage } from "@roundtable/shared";

export interface AIProviderAdapter {
  readonly provider: AIProvider;

  generateStream(
    model: string,
    messages: ProviderMessage[],
    options?: GenerateOptions
  ): Promise<ReadableStream<string>>;

  generate(
    model: string,
    messages: ProviderMessage[],
    options?: GenerateOptions
  ): Promise<string>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}
