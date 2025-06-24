import type { NextRequest } from "next/server";
import { getServerContext } from "@/actions/context";
import { sendMessageStream } from "@/core/application/claude/sendMessageStream";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get("message");
    const sessionId = searchParams.get("sessionId");
    const cwd = searchParams.get("cwd");

    if (!message || typeof message !== "string") {
      return new Response("Valid message is required", { status: 400 });
    }

    const context = getServerContext();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const initData = `data: ${JSON.stringify({ type: "init" })}\n\n`;
          controller.enqueue(encoder.encode(initData));

          const result = await sendMessageStream(
            context,
            {
              message,
              sessionId: sessionId || undefined,
              cwd: cwd || undefined,
            },
            (chunk: string) => {
              try {
                const data = `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));

                // Add explicit flush comment to prevent buffering
                const flushData = ": flush\n\n";
                controller.enqueue(encoder.encode(flushData));
              } catch (chunkError) {
                console.error("Error sending chunk:", chunkError);
              }
            },
          );

          if (result.isErr()) {
            const errorData = `data: ${JSON.stringify({
              type: "error",
              error: result.error.message || "Unknown error",
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
          } else {
            const { session, claudeResponse } = result.value;
            const completeData = `data: ${JSON.stringify({
              type: "complete",
              sessionId: session.id,
              projectId: session.projectId,
              content: claudeResponse.content,
              metadata: {
                id: claudeResponse.id,
                model: claudeResponse.model,
                stop_reason: claudeResponse.stop_reason,
                usage: claudeResponse.usage,
              },
            })}\n\n`;
            controller.enqueue(encoder.encode(completeData));
          }

          const endData = `data: ${JSON.stringify({ type: "end" })}\n\n`;
          controller.enqueue(encoder.encode(endData));

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          try {
            const errorData = `data: ${JSON.stringify({
              type: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
          } catch (encodingError) {
            console.error("Error encoding error message:", encodingError);
          }
          controller.close();
        }
      },
      cancel() {
        // Stream cancelled by client
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        "Transfer-Encoding": "chunked", // Force chunked encoding
        "X-Content-Type-Options": "nosniff", // Security header
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
