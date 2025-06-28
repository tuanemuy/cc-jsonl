import { err, ok, type Result } from "neverthrow";
import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ChunkData,
  SDKMessage,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";

export class MockClaudeService implements ClaudeService {
  private shouldFailNext = false;
  private mockResult: SDKMessage[] | null = null;
  private responseDelay = 0;

  async sendMessageStream(
    input: SendMessageInput,
    onChunk: (chunk: ChunkData) => void,
  ): Promise<Result<SDKMessage[], ClaudeError>> {
    console.log("[Mock Claude] Starting sendMessageStream for:", input.message);

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return err(new ClaudeError("Mock Claude service stream error"));
    }

    const responseText = `You said: ${input.message}`;

    const messages: SDKMessage[] = this.mockResult || [
      {
        type: "assistant",
        message: {
          id: "msg_stream_123",
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
          role: "assistant",
          model: "claude-3-sonnet-20240229",
          stop_reason: "end_turn",
          stop_sequence: null,
        },
      },
      {
        type: "result",
        subtype: "success",
        duration_ms: 1000,
        duration_api_ms: 800,
        is_error: false,
        num_turns: 1,
        result: "success",
        session_id: "test-session",
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 10,
          output_tokens: 15,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    ];

    // Stream each message sequentially
    for (const message of messages) {
      console.log("[Mock Claude] Sending message:", message.type);
      onChunk(message);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate streaming delay
    }

    console.log("[Mock Claude] Completed streaming. Returning messages.");
    return ok(messages);
  }

  // Test utility methods
  setMockResult(result: SDKMessage[]): void {
    this.mockResult = result;
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  setShouldFailNext(shouldFail: boolean): void {
    this.shouldFailNext = shouldFail;
  }

  reset(): void {
    this.shouldFailNext = false;
    this.mockResult = null;
    this.responseDelay = 0;
  }
}
