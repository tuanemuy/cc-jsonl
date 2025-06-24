import { err, ok, type Result } from "neverthrow";
import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ClaudeMessage,
  ClaudeResponse,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";

export class MockClaudeService implements ClaudeService {
  private shouldFailNext = false;
  private mockResponse: ClaudeResponse | null = null;
  private responseDelay = 0;

  async sendMessage(
    input: SendMessageInput,
    _messages: ClaudeMessage[],
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    if (this.responseDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return err(new ClaudeError("Mock Claude service error"));
    }

    const response: ClaudeResponse = this.mockResponse || {
      id: "msg_123",
      content: [
        {
          type: "text",
          text: `You said: ${input.message}`,
        },
      ],
      role: "assistant",
      model: "claude-3-sonnet-20240229",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 15,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    };

    return ok(response);
  }

  async sendMessageStream(
    input: SendMessageInput,
    _messages: ClaudeMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    console.log("[Mock Claude] Starting sendMessageStream for:", input.message);

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return err(new ClaudeError("Mock Claude service stream error"));
    }

    const responseText = `You said: ${input.message}`;
    const chunks = responseText.split(" ");

    console.log("[Mock Claude] Will send chunks:", chunks);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = `${chunks[i]} `;
      console.log("[Mock Claude] Sending chunk:", chunk);
      onChunk(chunk);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Slower for testing
    }

    const response: ClaudeResponse = this.mockResponse || {
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
      usage: {
        input_tokens: 10,
        output_tokens: 15,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    };

    return ok(response);
  }

  // Test utility methods
  setMockResponse(response: ClaudeResponse): void {
    this.mockResponse = response;
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  setShouldFailNext(shouldFail: boolean): void {
    this.shouldFailNext = shouldFail;
  }

  reset(): void {
    this.shouldFailNext = false;
    this.mockResponse = null;
    this.responseDelay = 0;
  }
}
