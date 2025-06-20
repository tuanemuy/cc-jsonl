import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ClaudeMessage,
  ClaudeResponse,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";
import { type Result, err } from "neverthrow";

export class MockClaudeService implements ClaudeService {
  async sendMessage(
    _input: SendMessageInput,
    _messages: ClaudeMessage[],
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    return err(new ClaudeError("Mock Claude service - not implemented"));
  }

  async sendMessageStream(
    _input: SendMessageInput,
    _messages: ClaudeMessage[],
    _onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    return err(new ClaudeError("Mock Claude service - not implemented"));
  }
}
