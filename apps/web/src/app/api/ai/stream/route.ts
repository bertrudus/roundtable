import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, messages as messagesTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DiscussionEngine } from "@/lib/orchestrator/discussion-engine";
import type { SessionConfig, Message } from "@roundtable/shared";

// Active engines keyed by session ID
const activeEngines = new Map<string, DiscussionEngine>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, action, content, participant, participantId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId required" },
        { status: 400 }
      );
    }

    if (action === "stop") {
      const engine = activeEngines.get(sessionId);
      if (engine) {
        engine.stop();
        activeEngines.delete(sessionId);
      }
      await db
        .update(sessions)
        .set({ status: "completed", updatedAt: new Date().toISOString() })
        .where(eq(sessions.id, sessionId));
      return NextResponse.json({ status: "stopped" });
    }

    if (action === "human_message") {
      const engine = activeEngines.get(sessionId);
      if (engine && content) {
        engine.submitHumanMessage(content);
      }
      return NextResponse.json({ status: "ok" });
    }

    if (action === "ready") {
      const engine = activeEngines.get(sessionId);
      if (engine) {
        engine.signalReady();
      }
      return NextResponse.json({ status: "ok" });
    }

    if (action === "add_participant") {
      const engine = activeEngines.get(sessionId);
      if (engine && participant) {
        engine.addParticipant(participant);
      }
      return NextResponse.json({ status: "ok" });
    }

    if (action === "remove_participant") {
      const engine = activeEngines.get(sessionId);
      if (engine && participantId) {
        engine.removeParticipant(participantId);
      }
      return NextResponse.json({ status: "ok" });
    }

    // Fetch session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const config = session.config as unknown as SessionConfig;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const engine = new DiscussionEngine(sessionId, config);
        activeEngines.set(sessionId, engine);

        await db
          .update(sessions)
          .set({ status: "active", updatedAt: new Date().toISOString() })
          .where(eq(sessions.id, sessionId));

        await engine.start({
          onTurnStart(participantId, turnNumber) {
            const event = JSON.stringify({
              type: "turn:start",
              participantId,
              turnNumber,
            });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));

            db.update(sessions)
              .set({
                currentSpeakerId: participantId,
                currentTurn: turnNumber,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(sessions.id, sessionId))
              .run();
          },

          onChunk(participantId, content) {
            const event = JSON.stringify({
              type: "chunk",
              participantId,
              content,
            });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          },

          onTurnEnd(message: Message) {
            const event = JSON.stringify({
              type: "turn:end",
              message,
            });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));

            db.insert(messagesTable)
              .values({
                id: message.id,
                sessionId: message.sessionId,
                participantId: message.participantId,
                participantName: message.participantName,
                role: message.role,
                content: message.content,
                turnNumber: message.turnNumber,
              })
              .run();
          },

          onHumanTurn(participantId, turnNumber) {
            const event = JSON.stringify({
              type: "human:waiting",
              participantId,
              turnNumber,
            });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          },

          onReadyForNext() {
            const event = JSON.stringify({ type: "await:ready" });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          },

          onSummary(summary) {
            const event = JSON.stringify({ type: "summary", summary });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          },

          onError(error) {
            const event = JSON.stringify({ type: "error", error });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          },

          onComplete() {
            const event = JSON.stringify({ type: "complete" });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
            activeEngines.delete(sessionId);

            db.update(sessions)
              .set({
                status: "completed",
                currentSpeakerId: null,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(sessions.id, sessionId))
              .run();

            controller.close();
          },
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Stream error:", err);
    return NextResponse.json(
      { error: "Failed to start discussion" },
      { status: 500 }
    );
  }
}
