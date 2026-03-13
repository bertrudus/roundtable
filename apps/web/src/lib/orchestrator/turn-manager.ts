import type { ParticipantConfig, TurnMode } from "@roundtable/shared";

export class TurnManager {
  private participants: ParticipantConfig[];
  private currentIndex: number;
  private turnMode: TurnMode;
  private turnCount: number;

  constructor(participants: ParticipantConfig[], turnMode: TurnMode) {
    this.participants = participants;
    this.currentIndex = -1;
    this.turnMode = turnMode;
    this.turnCount = 0;
  }

  getNextSpeaker(): ParticipantConfig {
    switch (this.turnMode) {
      case "round-robin":
        return this.roundRobinNext();
      case "open-floor":
        return this.openFloorNext();
      case "directed":
        return this.roundRobinNext(); // fallback to round-robin for now
    }
  }

  private roundRobinNext(): ParticipantConfig {
    this.currentIndex = (this.currentIndex + 1) % this.participants.length;
    this.turnCount++;
    return this.participants[this.currentIndex]!;
  }

  private openFloorNext(): ParticipantConfig {
    // Random selection, weighted away from the last speaker
    const candidates = this.participants.filter(
      (_, i) => i !== this.currentIndex || this.participants.length === 1
    );
    const idx = Math.floor(Math.random() * candidates.length);
    const selected = candidates[idx]!;
    this.currentIndex = this.participants.indexOf(selected);
    this.turnCount++;
    return selected;
  }

  getCurrentSpeaker(): ParticipantConfig | null {
    if (this.currentIndex < 0) return null;
    return this.participants[this.currentIndex] ?? null;
  }

  getTurnCount(): number {
    return this.turnCount;
  }

  setTurnMode(mode: TurnMode): void {
    this.turnMode = mode;
  }

  addParticipant(participant: ParticipantConfig): void {
    this.participants.push(participant);
  }

  removeParticipant(id: string): void {
    const idx = this.participants.findIndex((p) => p.id === id);
    if (idx < 0) return;
    this.participants.splice(idx, 1);
    // Adjust current index if needed
    if (this.currentIndex >= this.participants.length) {
      this.currentIndex = this.participants.length - 1;
    }
    if (idx <= this.currentIndex && this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  reset(): void {
    this.currentIndex = -1;
    this.turnCount = 0;
  }
}
