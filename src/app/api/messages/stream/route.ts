import type { NextRequest } from "next/server";
import { getServerContext } from "@/actions/context";
import { sendMessageStream } from "@/core/application/claude/sendMessageStream";
import type { ChunkData, SDKMessage } from "@/core/domain/claude/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get("message");
    const sessionId = searchParams.get("sessionId");
    const cwd = searchParams.get("cwd");
    const allowedToolsParam = searchParams.get("allowedTools");
    const bypassPermissionsParam = searchParams.get("bypassPermissions");

    if (!message || typeof message !== "string") {
      return new Response("Valid message is required", { status: 400 });
    }

    // If no sessionId is provided (new session), cwd is required
    if (!sessionId && !cwd) {
      return new Response(
        "cwd is required when creating a new session (no sessionId provided)",
        { status: 400 },
      );
    }

    const context = getServerContext();

    // Parse allowedTools if provided
    let allowedTools: string[] | undefined;
    if (allowedToolsParam) {
      try {
        allowedTools = JSON.parse(allowedToolsParam);
      } catch {
        return new Response("Invalid allowedTools parameter", { status: 400 });
      }
    }

    // Parse bypassPermissions if provided
    const bypassPermissions = bypassPermissionsParam === "true";

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
              allowedTools,
              bypassPermissions,
            },
            (chunk: ChunkData) => {
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
            const { session, messages } = result.value;

            // Find the last assistant message from SDK messages
            const assistantMessages = messages.filter(
              (msg): msg is Extract<SDKMessage, { type: "assistant" }> =>
                msg.type === "assistant",
            );
            const lastAssistantMessage =
              assistantMessages[assistantMessages.length - 1];

            // Get usage information from result messages
            const resultMessage = messages.find(
              (msg) => msg.type === "result",
            ) as
              | {
                  usage?: {
                    input_tokens: number;
                    output_tokens: number;
                    cache_creation_input_tokens?: number;
                    cache_read_input_tokens?: number;
                  };
                }
              | undefined;

            const usage = resultMessage?.usage || {
              input_tokens: 0,
              output_tokens: 0,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
            };

            const completeData = `data: ${JSON.stringify({
              type: "complete",
              sessionId: session.id,
              projectId: session.projectId,
              content: lastAssistantMessage?.message?.content || [],
              metadata: {
                id: lastAssistantMessage?.message?.id || "",
                model: lastAssistantMessage?.message?.model || "",
                stop_reason: lastAssistantMessage?.message?.stop_reason || null,
                usage,
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
