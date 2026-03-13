import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProviderMessage } from "@roundtable/shared";
import type { AIProviderAdapter, GenerateOptions } from "./types";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

/** Gemini requires strict user/model alternation — merge consecutive same-role messages */
function mergeConsecutive(msgs: GeminiMessage[]): GeminiMessage[] {
  const merged: GeminiMessage[] = [];
  for (const msg of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.parts[0]!.text += "\n\n" + msg.parts[0]!.text;
    } else {
      merged.push({ role: msg.role, parts: [{ text: msg.parts[0]!.text }] });
    }
  }
  return merged;
}

/** Ensure conversation starts with user and ends with user (Gemini requirements) */
function normalizeForGemini(msgs: GeminiMessage[]): GeminiMessage[] {
  if (msgs.length === 0) return [{ role: "user", parts: [{ text: "Please continue." }] }];
  // Must start with user
  if (msgs[0]!.role === "model") {
    msgs = [{ role: "user", parts: [{ text: "Begin." }] }, ...msgs];
  }
  // Must end with user
  if (msgs[msgs.length - 1]!.role === "model") {
    msgs = [...msgs, { role: "user", parts: [{ text: "Please continue the discussion." }] }];
  }
  return msgs;
}

export class GeminiAdapter implements AIProviderAdapter {
  readonly provider = "gemini" as const;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private prepareMessages(messages: ProviderMessage[]) {
    const systemMessage = messages.find((m) => m.role === "system");
    const raw = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
        parts: [{ text: m.content }],
      }));

    const conversation = normalizeForGemini(mergeConsecutive(raw));
    const history = conversation.slice(0, -1);
    const lastMessage = conversation[conversation.length - 1]!;

    return { systemMessage, history, lastMessage };
  }

  async generateStream(
    model: string,
    messages: ProviderMessage[],
    options?: GenerateOptions
  ): Promise<ReadableStream<string>> {
    const genModel = this.client.getGenerativeModel({ model });
    const { systemMessage, history, lastMessage } = this.prepareMessages(messages);

    console.log(`[Gemini] model=${model} history=${history.length} msgs, last=${lastMessage.parts[0]!.text.slice(0, 80)}...`);

    const chat = genModel.startChat({
      history,
      systemInstruction: systemMessage
        ? { role: "user" as const, parts: [{ text: systemMessage.content }] }
        : undefined,
      generationConfig: {
        temperature: options?.temperature ?? 0.8,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    });

    let result;
    try {
      result = await chat.sendMessageStream(lastMessage.parts[0]!.text);
    } catch (err) {
      console.error("[Gemini] sendMessageStream failed:", err);
      throw err;
    }

    return new ReadableStream({
      async start(controller) {
        let totalText = "";
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              totalText += text;
              controller.enqueue(text);
            }
            const candidates = chunk.candidates;
            if (candidates?.[0]?.finishReason && candidates[0].finishReason !== "STOP") {
              console.warn(`[Gemini] finishReason: ${candidates[0].finishReason}`);
            }
          }
        } catch (err) {
          console.error("[Gemini] stream iteration error:", err);
          // Close gracefully with whatever we have
        }
        if (!totalText) {
          console.warn("[Gemini] Empty response — no text generated");
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
    const genModel = this.client.getGenerativeModel({ model });
    const { systemMessage, history, lastMessage } = this.prepareMessages(messages);

    const chat = genModel.startChat({
      history,
      systemInstruction: systemMessage
        ? { role: "user" as const, parts: [{ text: systemMessage.content }] }
        : undefined,
      generationConfig: {
        temperature: options?.temperature ?? 0.8,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    });

    const result = await chat.sendMessage(lastMessage.parts[0]!.text);
    return result.response.text();
  }
}
