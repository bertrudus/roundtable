import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { sessions, participants, briefings } from "@/lib/db/schema";
import { createSessionSchema } from "@roundtable/shared";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { config } = parsed.data;
    const sessionId = nanoid();

    // Insert session
    await db.insert(sessions).values({
      id: sessionId,
      topic: config.topic,
      description: config.description ?? null,
      turnMode: config.turnMode,
      status: "configuring",
      config: config as unknown as Record<string, unknown>,
      currentTurn: 0,
      currentSpeakerId: null,
    });

    // Insert participants
    for (let i = 0; i < config.participants.length; i++) {
      const p = config.participants[i]!;
      await db.insert(participants).values({
        id: p.id,
        sessionId,
        name: p.name,
        provider: p.provider,
        model: p.model,
        systemPrompt: p.systemPrompt,
        personality: p.personality ?? null,
        color: p.color,
        seatIndex: i,
      });
    }

    // Store documents as briefings
    if (config.documents && config.documents.length > 0) {
      for (const doc of config.documents) {
        await db.insert(briefings).values({
          id: nanoid(),
          sessionId,
          filename: doc.name,
          content: doc.content,
        });
      }
    }

    return NextResponse.json({ id: sessionId, config, status: "configuring" });
  } catch (err) {
    console.error("Failed to create session:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allSessions = await db.select().from(sessions);
    return NextResponse.json(allSessions);
  } catch (err) {
    console.error("Failed to fetch sessions:", err);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
