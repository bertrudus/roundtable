/**
 * Sentence-level streaming TTS.
 *
 * Instead of waiting for the full AI response before starting TTS,
 * this buffers incoming text chunks and fires off TTS requests as
 * each sentence completes. Audio segments play sequentially via a queue.
 *
 * Latency improvement: first audio plays within ~300ms of first sentence
 * completing, instead of waiting for the entire response.
 */

export type StreamingTTSEvent = "start" | "end" | "boundary";

interface AudioSegment {
  text: string;
  blob: Blob | null;
  status: "fetching" | "ready" | "playing" | "done" | "error";
}

export class StreamingTTS {
  private voiceId: string;
  private playbackRate: number;
  private onEvent?: (event: StreamingTTSEvent) => void;

  private buffer = "";
  private segments: AudioSegment[] = [];
  private currentSegmentIndex = 0;
  private currentAudio: HTMLAudioElement | null = null;
  private mouthInterval: ReturnType<typeof setInterval> | null = null;
  private cancelled = false;
  private finished = false;
  private inputComplete = false;
  private objectUrls: string[] = [];

  constructor(
    voiceId: string,
    onEvent?: (event: StreamingTTSEvent) => void,
    playbackRate: number = 1
  ) {
    this.voiceId = voiceId;
    this.onEvent = onEvent;
    this.playbackRate = playbackRate;
    this.onEvent?.("start");
  }

  /** Feed a text chunk from the AI stream */
  pushChunk(chunk: string): void {
    if (this.cancelled) return;
    this.buffer += chunk;

    // Extract complete sentences (split on .!? followed by space or end)
    const sentenceEnd = /([.!?])\s+/g;
    let match: RegExpExecArray | null;
    let lastEnd = 0;

    while ((match = sentenceEnd.exec(this.buffer)) !== null) {
      const sentence = this.buffer.slice(lastEnd, match.index + 1).trim();
      lastEnd = match.index + match[0].length;
      if (sentence.length > 5) {
        this.queueSentence(sentence);
      }
    }

    // Keep the remainder in the buffer
    if (lastEnd > 0) {
      this.buffer = this.buffer.slice(lastEnd);
    }
  }

  /** Signal that AI generation is complete — flush remaining buffer */
  complete(): void {
    this.inputComplete = true;
    // Flush remaining text as final segment
    const remaining = this.buffer.trim();
    if (remaining.length > 0) {
      this.queueSentence(remaining);
    }
    this.buffer = "";

    // If no segments were queued at all, fire end immediately
    if (this.segments.length === 0) {
      this.fireEnd();
    }
  }

  /** Cancel all playback */
  cancel(): void {
    this.cancelled = true;
    if (this.mouthInterval) {
      clearInterval(this.mouthInterval);
      this.mouthInterval = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
    }
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls = [];
    this.fireEnd();
  }

  private queueSentence(text: string): void {
    const segment: AudioSegment = { text, blob: null, status: "fetching" };
    this.segments.push(segment);
    const index = this.segments.length - 1;

    // Fire off TTS request immediately (parallelizes with AI generation)
    this.fetchAudio(text, index);
  }

  private async fetchAudio(text: string, index: number): Promise<void> {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: this.voiceId }),
      });

      if (this.cancelled) return;

      if (!res.ok) {
        console.warn(`[StreamingTTS] Fetch failed for segment ${index}:`, res.status);
        this.segments[index]!.status = "error";
        this.tryPlayNext();
        return;
      }

      const blob = await res.blob();
      if (this.cancelled) return;

      this.segments[index]!.blob = blob;
      this.segments[index]!.status = "ready";

      // If this is the next segment to play, start playback
      this.tryPlayNext();
    } catch (e) {
      if (this.cancelled) return;
      console.warn(`[StreamingTTS] Error fetching segment ${index}:`, e);
      this.segments[index]!.status = "error";
      this.tryPlayNext();
    }
  }

  private tryPlayNext(): void {
    if (this.cancelled || this.currentAudio) return;

    const segment = this.segments[this.currentSegmentIndex];
    if (!segment) {
      // All segments processed
      if (this.inputComplete) {
        this.fireEnd();
      }
      return;
    }

    if (segment.status === "ready" && segment.blob) {
      this.playSegment(segment);
    } else if (segment.status === "error") {
      // Skip errored segments
      this.currentSegmentIndex++;
      this.tryPlayNext();
    }
    // If still fetching, wait — fetchAudio will call tryPlayNext when done
  }

  private playSegment(segment: AudioSegment): void {
    if (this.cancelled || !segment.blob) return;

    segment.status = "playing";
    const url = URL.createObjectURL(segment.blob);
    this.objectUrls.push(url);

    const audio = new Audio(url);
    audio.playbackRate = this.playbackRate;
    this.currentAudio = audio;

    audio.onplay = () => {
      this.mouthInterval = setInterval(() => {
        this.onEvent?.("boundary");
      }, 150);
    };

    audio.onended = () => {
      segment.status = "done";
      if (this.mouthInterval) {
        clearInterval(this.mouthInterval);
        this.mouthInterval = null;
      }
      this.currentAudio = null;
      this.currentSegmentIndex++;
      this.tryPlayNext();
    };

    audio.onerror = () => {
      segment.status = "done";
      if (this.mouthInterval) {
        clearInterval(this.mouthInterval);
        this.mouthInterval = null;
      }
      this.currentAudio = null;
      this.currentSegmentIndex++;
      this.tryPlayNext();
    };

    audio.play().catch(() => {
      segment.status = "done";
      this.currentAudio = null;
      this.currentSegmentIndex++;
      this.tryPlayNext();
    });
  }

  private fireEnd(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.mouthInterval) {
      clearInterval(this.mouthInterval);
      this.mouthInterval = null;
    }
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls = [];
    this.onEvent?.("end");
  }
}
