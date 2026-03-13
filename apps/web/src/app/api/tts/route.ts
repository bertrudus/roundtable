import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text, voiceId } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: "text and voiceId required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          optimize_streaming_latency: 3,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs error:", err);
      return NextResponse.json(
        { error: "TTS failed" },
        { status: response.status }
      );
    }

    // Stream audio back to client
    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json(
      { error: "TTS failed" },
      { status: 500 }
    );
  }
}

/** GET /api/tts?voices=1 — list available voices */
export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ voices: [] });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    const data = await res.json();

    const voices = (data.voices ?? []).map(
      (v: {
        voice_id: string;
        name: string;
        labels?: Record<string, string>;
        preview_url?: string;
      }) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender ?? "",
        accent: v.labels?.accent ?? "",
        age: v.labels?.age ?? "",
        previewUrl: v.preview_url ?? "",
      })
    );

    return NextResponse.json({ voices });
  } catch {
    return NextResponse.json({ voices: [] });
  }
}
