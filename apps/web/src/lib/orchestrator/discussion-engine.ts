import type {
  SessionConfig,
  ParticipantConfig,
  ProviderMessage,
  Message,
  ResponseLength,
} from "@roundtable/shared";
import { getProviderAdapter } from "../ai/provider-factory";
import { TurnManager } from "./turn-manager";
import { nanoid } from "nanoid";

const RESPONSE_LENGTH_CONFIG: Record<ResponseLength, { words: string; maxTokens: number }> = {
  brief: { words: "~50 words (1-2 sentences max)", maxTokens: 128 },
  short: { words: "~100 words (2-3 sentences)", maxTokens: 256 },
  medium: { words: "~200 words (1-2 short paragraphs)", maxTokens: 512 },
  long: { words: "~400 words (2-4 paragraphs)", maxTokens: 1024 },
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

  /** Original unchaired flow — guaranteed round-robin so everyone speaks */
  private async startUnchaired(callbacks: DiscussionCallbacks): Promise<void> {
    const maxTurns = this.config.maxTurns ?? 20;
    const panelists = this.config.participants.filter((p) => !p.isChair);

    // Build flat speaker queue
    const maxRounds = Math.ceil(maxTurns / panelists.length);
    const queue: ParticipantConfig[] = [];
    for (let r = 0; r < maxRounds; r++) {
      for (const p of panelists) queue.push(p);
    }

    await this.runPipelinedQueue(queue.slice(0, maxTurns), callbacks);
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

    // Calculate rounds: each round = all panelists speak + optional chair transition
    // Reserve 2 turns for intro + summary
    const turnsPerRound = allPanelists.length + 1; // +1 for chair transition
    const availableTurns = maxTurns - 2; // minus intro and summary
    const maxRounds = Math.max(1, Math.floor(availableTurns / turnsPerRound));

    // Build queue: [round1 panelists, chair transition, round2 panelists, ...]
    const queue: Array<ParticipantConfig | { chairRole: "transition" }> = [];
    for (let round = 0; round < maxRounds; round++) {
      for (const p of allPanelists) queue.push(p);
      if (round < maxRounds - 1) queue.push({ chairRole: "transition" });
    }

    // Run pipelined — panelists use pre-generation, chair transitions run inline
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
      // Send summary event with last chair message
      const lastChairMsg = [...this.transcript]
        .reverse()
        .find((m) => m.participantId === chair.id);
      if (lastChairMsg) {
        callbacks.onSummary(lastChairMsg.content);
      }
    }
  }

  /**
   * Run a queue of speakers with pipelining: while the client plays TTS for
   * the current turn, we pre-generate the next non-human turn's AI response.
   * This overlaps AI latency with TTS playback.
   */
  private async runPipelinedQueue(
    queue: ParticipantConfig[],
    callbacks: DiscussionCallbacks
  ): Promise<void> {
    for (let i = 0; i < queue.length && this.running; i++) {
      if (this.abortController?.signal.aborted) break;
      await this.doTurn(queue[i]!, callbacks);
    }
  }

  /** Execute a single participant turn with full error handling and pacing */
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

  /** Execute a chair turn with role-specific prompting */
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
    const lengthConfig = RESPONSE_LENGTH_CONFIG[this.config.responseLength ?? "medium"];

    const panelistNames = panelists.map((p) => p.name).join(", ");
    const panelistDetails = panelists
      .map((p) => `${p.name} (${p.personality || "participant"})`)
      .join(", ");

    let directive: string;
    if (role === "introduce") {
      directive = `You are the Chair moderating a roundtable discussion.

Topic: "${this.config.topic}"${this.config.description ? `\nContext: ${this.config.description}` : ""}

Panelists: ${panelistDetails}

Introduce the topic engagingly and briefly welcome the panel. Set the stage for a productive discussion. Keep it to ${lengthConfig.words}.
Do NOT prefix your response with your name or any label.`;
    } else if (role === "transition") {
      directive = `You are the Chair moderating a roundtable discussion on "${this.config.topic}".

Panelists: ${panelistNames}

Based on what has been said so far, provide a brief transition. Highlight a key tension or agreement, then pose a follow-up question or angle to explore. Keep it to ${lengthConfig.words}.
Do NOT prefix your response with your name or any label.`;
    } else {
      // summary
      directive = `You are the Chair moderating a roundtable discussion on "${this.config.topic}".

Panelists: ${panelistNames}

The discussion is wrapping up. Provide a concise summary of the key points raised, note areas of agreement and disagreement, and offer a final thought. Keep it under ~200 words.
Do NOT prefix your response with your name or any label.`;
    }

    const messages: ProviderMessage[] = [
      { role: "system", content: directive },
    ];

    // Include transcript for context
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
    const stream = await adapter.generateStream(chair.model, messages, {
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

  /** Client signals it's ready for the next turn (TTS finished) */
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
      // Safety timeout — if client never signals, continue after 20s
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
    const messages = this.buildContext(speaker);
    const lengthConfig = RESPONSE_LENGTH_CONFIG[this.config.responseLength ?? "medium"];

    let fullContent = "";
    const stream = await adapter.generateStream(speaker.model, messages, {
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

    const lengthConfig = RESPONSE_LENGTH_CONFIG[this.config.responseLength ?? "medium"];

    return `${speaker.systemPrompt}

You are "${speaker.name}" participating in a roundtable discussion with: ${otherParticipants}.
Topic: "${this.config.topic}"

Guidelines:
- Stay in character and provide substantive contributions
- Respond to what others have said, building on or respectfully challenging their points
- Keep responses to ${lengthConfig.words}
- Be engaging and conversational, not lecture-like
- NEVER prefix your response with your name, brackets, or any label like "[Name]:" — just speak naturally
${speaker.personality ? `\nPersonality: ${speaker.personality}` : ""}`;
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
