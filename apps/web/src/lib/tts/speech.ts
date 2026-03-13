export interface ElevenLabsVoice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  age: string;
  previewUrl: string;
}

/** Default voice assignments when user doesn't pick one */
export const DEFAULT_VOICE_IDS = [
  "EXAVITQu4vr4xnSDxMaL", // Sarah
  "onwK4e9ZLuTAKqWW03F9", // Daniel
  "Xb7hH8MSUJpSbSDYk0k2", // Alice
  "JBFqnCBsd6RMkjVDRZzb", // George
  "cgSgspJ2msm6clMCkdW9", // Jessica
  "IKne3meq5aSn9XLyUdCD", // Charlie
  "pFZP5JQG7iQjIQuC4Bku", // Lily
  "CwhRBWXzGAHq8TQ4Fs17", // Roger
];

export type SpeakingCallback = (state: "start" | "end" | "boundary") => void;

/**
 * Speak text via ElevenLabs TTS through our API route.
 * Streams audio directly from the response for lowest latency.
 * Returns a cancel function.
 */
export function speakElevenLabs(
  text: string,
  voiceId: string,
  onEvent?: SpeakingCallback,
  playbackRate: number = 1
): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  let finished = false;
  let audio: HTMLAudioElement | null = null;
  let mouthInterval: ReturnType<typeof setInterval> | null = null;
  let objectUrl: string | null = null;

  const cleanup = () => {
    if (mouthInterval) { clearInterval(mouthInterval); mouthInterval = null; }
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  };

  const fireEnd = () => {
    if (finished) return;
    finished = true;
    cleanup();
    onEvent?.("end");
  };

  (async () => {
    try {
      onEvent?.("start");

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });

      if (cancelled || !res.ok) {
        fireEnd();
        return;
      }

      // Stream audio: create a blob URL from the streaming response
      // and start playback as soon as enough data is buffered
      const blob = await res.blob();
      if (cancelled) { fireEnd(); return; }

      objectUrl = URL.createObjectURL(blob);
      audio = new Audio(objectUrl);
      audio.playbackRate = playbackRate;
      // Pre-buffer less aggressively for faster start
      audio.preload = "auto";

      audio.onplay = () => {
        mouthInterval = setInterval(() => {
          onEvent?.("boundary");
        }, 150);
      };

      audio.onended = () => fireEnd();
      audio.onerror = () => fireEnd();

      audio.play().catch(() => fireEnd());
    } catch {
      fireEnd();
    }
  })();

  return () => {
    cancelled = true;
    cleanup();
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    fireEnd();
  };
}

/** Fetch available voices from our API */
export async function fetchVoices(): Promise<ElevenLabsVoice[]> {
  try {
    const res = await fetch("/api/tts?voices=1");
    const data = await res.json();
    return data.voices ?? [];
  } catch {
    return [];
  }
}
