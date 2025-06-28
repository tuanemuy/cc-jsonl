import { query } from "@anthropic-ai/claude-code";
import { err, ok, type Result } from "neverthrow";
import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ChunkData,
  SDKMessage,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";

export class AnthropicClaudeService implements ClaudeService {
  constructor(private readonly pathToClaudeCodeExecutable?: string) {}

  async sendMessageStream(
    input: SendMessageInput,
    onChunk: (chunk: ChunkData) => void,
  ): Promise<Result<SDKMessage[], ClaudeError>> {
    try {
      // Build options for Claude Code SDK
      const options: {
        pathToClaudeCodeExecutable?: string;
        resume?: string;
        cwd?: string;
        allowedTools?: string[];
      } = {
        pathToClaudeCodeExecutable: this.pathToClaudeCodeExecutable,
      };

      // Add session resume if Claude session ID is provided
      if (input.sessionId) {
        options.resume = input.sessionId;
      }

      // Add working directory if provided
      if (input.cwd) {
        options.cwd = input.cwd;
      }

      // Add allowed tools if provided
      if (input.allowedTools) {
        options.allowedTools = input.allowedTools;
      }

      const messages: SDKMessage[] = [];

      // Simply pass each SDK message directly to onChunk
      for await (const message of query({
        prompt: input.message,
        options,
      })) {
        const customMessage = message as unknown as SDKMessage;
        messages.push(customMessage);

        // Send the entire message as a chunk
        onChunk(customMessage);
      }

      if (messages.length === 0) {
        throw new Error("No response received from Claude Code SDK");
      }

      return ok(messages);
    } catch (error) {
      return err(
        new ClaudeError("Failed to stream message from Claude", error),
      );
    }
  }
}
