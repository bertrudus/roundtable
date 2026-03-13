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
  // Mouth animation interval
  let mouthInterval: ReturnType<typeof setInterval> | null = null;

  const fireEnd = () => {
    if (finished) return;
    finished = true;
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

      const blob = await res.blob();
      if (cancelled) {
        fireEnd();
        return;
      }

      const url = URL.createObjectURL(blob);
      audio = new Audio(url);
      audio.playbackRate = playbackRate;

      // Simulate word boundaries for lip sync — toggle every ~150ms while playing
      audio.onplay = () => {
        mouthInterval = setInterval(() => {
          onEvent?.("boundary");
        }, 150);
      };

      audio.onended = () => {
        if (mouthInterval) clearInterval(mouthInterval);
        URL.revokeObjectURL(url);
        fireEnd();
      };

      audio.onerror = () => {
        if (mouthInterval) clearInterval(mouthInterval);
        URL.revokeObjectURL(url);
        fireEnd();
      };

      audio.play().catch(() => fireEnd());
    } catch {
      fireEnd();
    }
  })();

  return () => {
    cancelled = true;
    if (mouthInterval) clearInterval(mouthInterval);
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
