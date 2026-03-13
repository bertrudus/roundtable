import Anthropic from "@anthropic-ai/sdk";
import type { ProviderMessage } from "@roundtable/shared";
import type { AIProviderAdapter, GenerateOptions } from "./types";

export class AnthropicAdapter implements AIProviderAdapter {
  readonly provider = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateStream(
    model: string,
    messages: ProviderMessage[],
    options?: GenerateOptions
  ): Promise<ReadableStream<string>> {
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const stream = this.client.messages.stream({
      model,
      system: systemMessage?.content,
      messages: conversationMessages,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.8,
    });

    return new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(event.delta.text);
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
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model,
      system: systemMessage?.content,
      messages: conversationMessages,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.8,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text : "";
  }
}
