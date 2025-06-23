import type { NextRequest } from "next/server";
import { getServerContext } from "@/actions/context";
import { sendMessageStream } from "@/core/application/claude/sendMessageStream";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message) {
      return new Response("Message is required", { status: 400 });
    }

    const context = getServerContext();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await sendMessageStream(
            context,
            { message, sessionId },
            (chunk: string) => {
              // Send chunk as Server-Sent Event
              const data = `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
            },
          );

          if (result.isErr()) {
            const errorData = `data: ${JSON.stringify({ type: "error", error: result.error.message })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
          } else {
            const { session, assistantMessage } = result.value;
            const completeData = `data: ${JSON.stringify({
              type: "complete",
              sessionId: session.id,
              projectId: session.projectId,
              messageId: assistantMessage.id,
            })}\n\n`;
            controller.enqueue(encoder.encode(completeData));
          }

          controller.close();
        } catch (_error) {
          const errorData = `data: ${JSON.stringify({ type: "error", error: "Internal server error" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (_error) {
    return new Response("Internal server error", { status: 500 });
  }
}
