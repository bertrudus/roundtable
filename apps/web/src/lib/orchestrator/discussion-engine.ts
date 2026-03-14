import type {
  SessionConfig,
  ParticipantConfig,
  ProviderMessage,
  Message,
  ResponseLength,
  DiscussionQuality,
  DiscussionMode,
} from "@roundtable/shared";
import { MODEL_TIERS } from "@roundtable/shared";
import { getProviderAdapter } from "../ai/provider-factory";
import { TurnManager } from "./turn-manager";
import { nanoid } from "nanoid";

const RESPONSE_LENGTH_CONFIG: Record<ResponseLength, { words: string; maxTokens: number }> = {
  verbose: { words: "10-20 words (1 punchy sentence)", maxTokens: 64 },
  brief: { words: "20-40 words (1-2 sentences)", maxTokens: 128 },
  expansive: { words: "40-100 words (a short paragraph)", maxTokens: 256 },
};

const DISCUSSION_MODE_PROMPTS: Record<DiscussionMode, string> = {
  debate: `This is a DEBATE. Take strong positions. Challenge other panelists directly.
Push back on weak arguments. Be persuasive and assertive. Disagreement is encouraged.`,
  review: `This is a REVIEW session. Offer constructive, balanced feedback.
Highlight strengths and weaknesses. Suggest improvements. Be fair and thorough.`,
  critic: `This is a CRITICAL ANALYSIS. Be sharp, analytical, and demanding.
Dissect ideas rigorously. Point out flaws, logical gaps, and unexamined assumptions.
Be intellectually honest — praise what deserves it, but don't soften real critiques.`,
};

export interface DiscussionCallbacks {
  onTurnStart: (participantId: string, turnNumber: number) => void;
  onChunk: (participantId: string, content: string) => void;
  onTurnEnd: (message: Message) => void;
  onHumanTurn: (participantId: string, turnNumber: number) => void;
  onReadyForNext: () => void;
  onError: (error: string) => void;
  onSummary: (summary: string) => void;
  onComplete: () => void;
}

export class DiscussionEngine {
  private config: SessionConfig;
  private turnManager: TurnManager;
  private transcript: Message[];
  private running: boolean;
  private abortController: AbortController | null;
  private sessionId: string;
  private humanInputResolver: ((message: string) => void) | null = null;
  private readyResolver: (() => void) | null = null;
  private turnCount = 0;

  constructor(sessionId: string, config: SessionConfig) {
    this.sessionId = sessionId;
    this.config = config;
    this.turnManager = new TurnManager(config.participants, config.turnMode);
    this.transcript = [];
    this.running = false;
    this.abortController = null;
  }

  async start(callbacks: DiscussionCallbacks): Promise<void> {
    this.running = true;
    this.abortController = new AbortController();

    const chair = this.config.participants.find((p) => p.isChair);

    if (chair && this.config.enableChair) {
      await this.startChaired(chair, callbacks);
    } else {
      await this.startUnchaired(callbacks);
    }

    this.running = false;
    callbacks.onComplete();
  }

  /** Unchaired flow — round-robin + summary at end */
  private async startUnchaired(callbacks: DiscussionCallbacks): Promise<void> {
    const maxTurns = this.config.maxTurns ?? 20;
    const panelists = this.config.participants.filter((p) => !p.isChair);

    const maxRounds = Math.ceil(maxTurns / panelists.length);
    const queue: ParticipantConfig[] = [];
    for (let r = 0; r < maxRounds; r++) {
      for (const p of panelists) queue.push(p);
    }

    await this.runPipelinedQueue(queue.slice(0, maxTurns), callbacks);

    // Generate a summary even without a chair
    if (this.running && this.transcript.length > 0) {
      await this.generateSummary(callbacks);
    }
  }

  /** Chaired flow: intro → rounds with guaranteed participation → summary */
  private async startChaired(
    chair: ParticipantConfig,
    callbacks: DiscussionCallbacks
  ): Promise<void> {
    const panelists = this.config.participants.filter(
      (p) => !p.isChair && !p.isHuman
    );
    const humans = this.config.participants.filter((p) => p.isHuman);
    const allPanelists = [...panelists, ...humans];
    const maxTurns = this.config.maxTurns ?? 20;

    // Chair introduction
    if (this.running) {
      await this.doChairTurn(chair, "introduce", allPanelists, callbacks);
    }

    // Calculate rounds
    const turnsPerRound = allPanelists.length + 1;
    const availableTurns = maxTurns - 2;
    const maxRounds = Math.max(1, Math.floor(availableTurns / turnsPerRound));

    const queue: Array<ParticipantConfig | { chairRole: "transition" }> = [];
    for (let round = 0; round < maxRounds; round++) {
      for (const p of allPanelists) queue.push(p);
      if (round < maxRounds - 1) queue.push({ chairRole: "transition" });
    }

    for (const entry of queue) {
      if (!this.running || this.abortController?.signal.aborted) break;
      if ("chairRole" in entry) {
        await this.doChairTurn(chair, "transition", allPanelists, callbacks);
      } else {
        await this.doTurn(entry, callbacks);
      }
    }

    // Chair wrap-up summary
    if (this.running) {
      await this.doChairTurn(chair, "summary", allPanelists, callbacks);
      const lastChairMsg = [...this.transcript]
        .reverse()
        .find((m) => m.participantId === chair.id);
      if (lastChairMsg) {
        callbacks.onSummary(lastChairMsg.content);
      }
    }
  }

  /** Generate summary without a chair (unchaired mode) */
  private async generateSummary(callbacks: DiscussionCallbacks): Promise<void> {
    // Use the first participant's provider to generate a summary
    const firstParticipant = this.config.participants.find((p) => !p.isHuman);
    if (!firstParticipant) return;

    const adapter = getProviderAdapter(firstParticipant.provider);
    const model = this.resolveModel(firstParticipant);
    const mode = this.config.discussionMode ?? "debate";
    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

    const messages: ProviderMessage[] = [
      {
        role: "system",
        content: `You are a neutral summariser. A ${modeLabel} session just concluded on "${this.config.topic}". Provide a concise summary (150-250 words): key points raised, areas of agreement, areas of disagreement, and a concluding thought. Do NOT prefix your response with any label.`,
      },
    ];

    for (const entry of this.transcript) {
      messages.push({
        role: "user",
        content: `[${entry.participantName}]: ${entry.content}`,
      });
    }

    messages.push({
      role: "user",
      content: "Please provide the summary now.",
    });

    let fullContent = "";
    const stream = await adapter.generateStream(model, messages, { maxTokens: 512 });
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullContent += value;
    }

    if (fullContent) {
      callbacks.onSummary(fullContent);
    }
  }

  private async runPipelinedQueue(
    queue: ParticipantConfig[],
    callbacks: DiscussionCallbacks
  ): Promise<void> {
    for (let i = 0; i < queue.length && this.running; i++) {
      if (this.abortController?.signal.aborted) break;
      await this.doTurn(queue[i]!, callbacks);
    }
  }

  private async doTurn(
    speaker: ParticipantConfig,
    callbacks: DiscussionCallbacks
  ): Promise<void> {
    this.turnCount++;
    const turnNumber = this.turnCount;

    callbacks.onTurnStart(speaker.id, turnNumber);

    try {
      let message: Message;

      if (speaker.isHuman) {
        callbacks.onHumanTurn(speaker.id, turnNumber);
        const humanText = await this.waitForHumanInput();
        if (!this.running) return;

        message = {
          id: nanoid(),
          sessionId: this.sessionId,
          participantId: speaker.id,
          participantName: speaker.name,
          role: "user",
          content: humanText,
          turnNumber,
          timestamp: new Date().toISOString(),
        };
      } else {
        message = await this.executeTurn(speaker, turnNumber, callbacks);
      }

      this.transcript.push(message);
      callbacks.onTurnEnd(message);

      if (!speaker.isHuman) {
        callbacks.onReadyForNext();
        await this.waitForReady();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      callbacks.onError(`${speaker.name}: ${errorMsg}`);
      await this.delay(2000);
    }
  }

  private async doChairTurn(
    chair: ParticipantConfig,
    role: "introduce" | "transition" | "summary",
    panelists: ParticipantConfig[],
    callbacks: DiscussionCallbacks
  ): Promise<void> {
    this.turnCount++;
    const turnNumber = this.turnCount;

    callbacks.onTurnStart(chair.id, turnNumber);

    try {
      const message = await this.executeChairTurn(
        chair,
        role,
        panelists,
        turnNumber,
        callbacks
      );

      this.transcript.push(message);
      callbacks.onTurnEnd(message);
      callbacks.onReadyForNext();
      await this.waitForReady();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      callbacks.onError(`${chair.name}: ${errorMsg}`);
      await this.delay(2000);
    }
  }

  private async executeChairTurn(
    chair: ParticipantConfig,
    role: "introduce" | "transition" | "summary",
    panelists: ParticipantConfig[],
    turnNumber: number,
    callbacks: DiscussionCallbacks
  ): Promise<Message> {
    const adapter = getProviderAdapter(chair.provider);
    const model = this.resolveModel(chair);
    const lengthConfig = RESPONSE_LENGTH_CONFIG[this.config.responseLength ?? "brief"];
    const mode = this.config.discussionMode ?? "debate";
    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

    const panelistNames = panelists.map((p) => p.name).join(", ");
    const panelistDetails = panelists
      .map((p) => `${p.name} (${p.personality || "participant"})`)
      .join(", ");

    let directive: string;
    if (role === "introduce") {
      directive = `${chair.systemPrompt}

Topic: "${this.config.topic}"${this.config.description ? `\nContext: ${this.config.description}` : ""}
Mode: ${modeLabel}

Panelists: ${panelistDetails}

Introduce the topic engagingly and briefly welcome the panel. Set the stage for a productive ${mode} session. Keep it to ${lengthConfig.words}.
Do NOT prefix your response with your name or any label.`;
    } else if (role === "transition") {
      directive = `${chair.systemPrompt}

Topic: "${this.config.topic}"
Mode: ${modeLabel}
Panelists: ${panelistNames}

Based on what has been said so far, provide a brief transition. Highlight a key tension or agreement, then pose a follow-up question or angle to explore. Keep it to ${lengthConfig.words}.
Do NOT prefix your response with your name or any label.`;
    } else {
      directive = `${chair.systemPrompt}

Topic: "${this.config.topic}"
Mode: ${modeLabel}
Panelists: ${panelistNames}

The ${mode} session is wrapping up. Provide a concise summary of the key points raised, note areas of agreement and disagreement, and offer a final thought. Keep it under ~200 words.
Do NOT prefix your response with your name or any label.`;
    }

    const messages: ProviderMessage[] = [
      { role: "system", content: directive },
    ];

    for (const entry of this.transcript) {
      if (entry.participantId === chair.id) {
        messages.push({ role: "assistant", content: entry.content });
      } else {
        messages.push({
          role: "user",
          content: `[${entry.participantName}]: ${entry.content}`,
        });
      }
    }

    if (this.transcript.length === 0 && role === "introduce") {
      messages.push({
        role: "user",
        content: "Please introduce the topic and welcome the panelists.",
      });
    }

    let fullContent = "";
    const maxTokens = role === "summary" ? 512 : lengthConfig.maxTokens;
    const stream = await adapter.generateStream(model, messages, {
      maxTokens,
    });
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullContent += value;
      callbacks.onChunk(chair.id, value);
    }

    return {
      id: nanoid(),
      sessionId: this.sessionId,
      participantId: chair.id,
      participantName: chair.name,
      role: "assistant",
      content: fullContent,
      turnNumber,
      timestamp: new Date().toISOString(),
    };
  }

  submitHumanMessage(content: string): void {
    if (this.humanInputResolver) {
      this.humanInputResolver(content);
      this.humanInputResolver = null;
    }
  }

  signalReady(): void {
    if (this.readyResolver) {
      this.readyResolver();
      this.readyResolver = null;
    }
  }

  private waitForHumanInput(): Promise<string> {
    return new Promise<string>((resolve) => {
      this.humanInputResolver = resolve;
    });
  }

  private waitForReady(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.readyResolver = resolve;
      setTimeout(() => {
        if (this.readyResolver === resolve) {
          this.readyResolver = null;
          resolve();
        }
      }, 20_000);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeTurn(
    speaker: ParticipantConfig,
    turnNumber: number,
    callbacks: DiscussionCallbacks
  ): Promise<Message> {
    const adapter = getProviderAdapter(speaker.provider);
    const model = this.resolveModel(speaker);
    const messages = this.buildContext(speaker);
    const lengthConfig = RESPONSE_LENGTH_CONFIG[this.config.responseLength ?? "brief"];

    let fullContent = "";
    const stream = await adapter.generateStream(model, messages, {
      maxTokens: lengthConfig.maxTokens,
    });
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullContent += value;
      callbacks.onChunk(speaker.id, value);
    }

    return {
      id: nanoid(),
      sessionId: this.sessionId,
      participantId: speaker.id,
      participantName: speaker.name,
      role: "assistant",
      content: fullContent,
      turnNumber,
      timestamp: new Date().toISOString(),
    };
  }

  private buildContext(speaker: ParticipantConfig): ProviderMessage[] {
    const messages: ProviderMessage[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(speaker),
      },
    ];

    for (const entry of this.transcript) {
      if (entry.participantId === speaker.id) {
        messages.push({ role: "assistant", content: entry.content });
      } else {
        messages.push({
          role: "user",
          content: `[${entry.participantName}]: ${entry.content}`,
        });
      }
    }

    if (this.transcript.length === 0) {
      messages.push({
        role: "user",
        content: `The discussion topic is: "${this.config.topic}"${
          this.config.description
            ? `\n\nAdditional context: ${this.config.description}`
            : ""
        }\n\nPlease share your opening thoughts.`,
      });
    }

    return messages;
  }

  private buildSystemPrompt(speaker: ParticipantConfig): string {
    const otherParticipants = this.config.participants
      .filter((p) => p.id !== speaker.id && !p.isChair)
      .map((p) => `${p.name}${p.isHuman ? " (human)" : ""}`)
      .join(", ");

    const lengthConfig = RESPONSE_LENGTH_CONFIG[this.config.responseLength ?? "brief"];
    const mode = this.config.discussionMode ?? "debate";
    const modeDirective = DISCUSSION_MODE_PROMPTS[mode] ?? "";

    return `${speaker.systemPrompt}

You are "${speaker.name}" participating in a roundtable ${mode} with: ${otherParticipants}.
Topic: "${this.config.topic}"

${modeDirective}

Guidelines:
- Stay in character and provide substantive contributions
- Respond to what others have said, building on or respectfully challenging their points
- Keep responses to ${lengthConfig.words}
- Be engaging and conversational, not lecture-like
- NEVER prefix your response with your name, brackets, or any label like "[Name]:" — just speak naturally
${speaker.personality ? `\nPersonality: ${speaker.personality}` : ""}`;
  }

  private resolveModel(participant: ParticipantConfig): string {
    const quality = this.config.discussionQuality ?? "balanced";
    if (quality === "balanced") return participant.model;
    const tier = MODEL_TIERS[participant.provider];
    if (!tier) return participant.model;
    return tier[quality] ?? participant.model;
  }

  stop(): void {
    this.running = false;
    this.abortController?.abort();
    if (this.humanInputResolver) {
      this.humanInputResolver("");
      this.humanInputResolver = null;
    }
    if (this.readyResolver) {
      this.readyResolver();
      this.readyResolver = null;
    }
  }

  addParticipant(participant: ParticipantConfig): void {
    this.config.participants.push(participant);
    this.turnManager.addParticipant(participant);
  }

  removeParticipant(id: string): void {
    this.config.participants = this.config.participants.filter((p) => p.id !== id);
    this.turnManager.removeParticipant(id);
  }

  pause(): void {
    this.running = false;
  }

  getTranscript(): Message[] {
    return [...this.transcript];
  }

  isRunning(): boolean {
    return this.running;
  }
}
