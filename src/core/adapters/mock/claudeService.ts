import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ClaudeMessage,
  ClaudeResponse,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";
import { type Result, err, ok } from "neverthrow";

export class MockClaudeService implements ClaudeService {
  private shouldFailNext = false;
  private mockResponse: ClaudeResponse | null = null;
  private responseDelay = 0;

  async sendMessage(
    input: SendMessageInput,
    messages: ClaudeMessage[],
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
      usage: {
        input_tokens: 10,
        output_tokens: 15,
      },
    };

    return ok(response);
  }

  async sendMessageStream(
    input: SendMessageInput,
    messages: ClaudeMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return err(new ClaudeError("Mock Claude service stream error"));
    }

    const responseText = `You said: ${input.message}`;
    const chunks = responseText.split(" ");

    for (const chunk of chunks) {
      onChunk(`${chunk} `);
      await new Promise((resolve) => setTimeout(resolve, 10));
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
      usage: {
        input_tokens: 10,
        output_tokens: 15,
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
