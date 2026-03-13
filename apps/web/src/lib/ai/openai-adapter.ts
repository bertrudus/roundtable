import OpenAI from "openai";
import type { ProviderMessage } from "@roundtable/shared";
import type { AIProviderAdapter, GenerateOptions } from "./types";

export class OpenAIAdapter implements AIProviderAdapter {
  readonly provider = "openai" as const;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateStream(
    model: string,
    messages: ProviderMessage[],
    options?: GenerateOptions
  ): Promise<ReadableStream<string>> {
    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 1024,
      stream: true,
    });

    return new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(content);
          }
        }
        controller.close();
      },
    });
  }

  async generate(
    model: string,
    messages: ProviderMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 1024,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
