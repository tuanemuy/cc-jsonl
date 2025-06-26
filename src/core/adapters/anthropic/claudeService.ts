import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { err, ok, type Result } from "neverthrow";
import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ClaudeQueryResult,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";

export class AnthropicClaudeService implements ClaudeService {
  constructor(private readonly pathToClaudeCodeExecutable?: string) {}

  private buildQueryResult(allMessages: SDKMessage[]): ClaudeQueryResult {
    // Find the last assistant message
    const assistantMessages = allMessages.filter(
      (msg) => msg.type === "assistant",
    );
    const lastAssistantMessage =
      assistantMessages[assistantMessages.length - 1];

    // Get usage information from result messages
    const resultMessage = allMessages.find((msg) => msg.type === "result") as
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

    return {
      messages: allMessages,
      lastAssistantMessage: lastAssistantMessage?.message,
      usage,
    };
  }

  async sendMessage(
    input: SendMessageInput,
  ): Promise<Result<ClaudeQueryResult, ClaudeError>> {
    try {
      const options: {
        pathToClaudeCodeExecutable?: string;
        resume?: string;
        cwd?: string;
        allowedTools?: string[];
      } = {
        pathToClaudeCodeExecutable: this.pathToClaudeCodeExecutable,
      };

      // Add session resume if sessionId is provided
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

      for await (const message of query({
        prompt: input.message,
        options,
      })) {
        messages.push(message);
      }

      if (messages.length === 0) {
        throw new Error("No response received");
      }

      const queryResult: ClaudeQueryResult = this.buildQueryResult(messages);

      return ok(queryResult);
    } catch (error) {
      return err(new ClaudeError("Failed to send message to Claude", error));
    }
  }

  async sendMessageStream(
    input: SendMessageInput,
    onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeQueryResult, ClaudeError>> {
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

      // Add session resume if sessionId is provided
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

      // Track accumulated content for proper incremental streaming
      const contentTrackers = new Map<string, string>(); // Track by content block type/id
      const processedBlocks = new Set<string>(); // Track which blocks we've already sent

      for await (const message of query({
        prompt: input.message,
        options,
      })) {
        messages.push(message);

        if (message.type === "assistant" && message.message?.content) {
          for (const contentBlock of message.message.content) {
            if (contentBlock.type === "text") {
              const blockId = `text-${Math.random()}`;
              const previousContent = contentTrackers.get(blockId) || "";
              const currentContent = contentBlock.text;

              if (currentContent.length > previousContent.length) {
                const incrementalText = currentContent.slice(
                  previousContent.length,
                );
                contentTrackers.set(blockId, currentContent);
                // Send as NDJSON
                onChunk(
                  JSON.stringify({ type: "text", text: incrementalText }) +
                    "\n",
                );
              }
            } else if (contentBlock.type === "thinking") {
              const blockId = `thinking-${Math.random()}`;
              const previousContent = contentTrackers.get(blockId) || "";
              const currentContent = contentBlock.content;

              if (currentContent.length > previousContent.length) {
                const incrementalThinking = currentContent.slice(
                  previousContent.length,
                );
                contentTrackers.set(blockId, currentContent);
                // Send as NDJSON
                onChunk(
                  `${JSON.stringify({
                    type: "thinking",
                    content: incrementalThinking,
                  })}\n`,
                );
              }
            } else {
              // Handle all other content block types (tool_use, image, document, tool_result, etc.)
              // Only send once per block
              const blockKey = `${contentBlock.type}-${JSON.stringify(contentBlock)}`;
              if (!processedBlocks.has(blockKey)) {
                processedBlocks.add(blockKey);
                onChunk(`${JSON.stringify(contentBlock)}\n`);
              }
            }
          }
        } else if (message.type === "user" && message.message) {
          // Process user message content blocks individually
          if (
            message.message.content &&
            Array.isArray(message.message.content)
          ) {
            for (const contentBlock of message.message.content) {
              if (contentBlock.type === "text") {
                // Send text content
                onChunk(
                  `${JSON.stringify({ type: "text", text: contentBlock.text })}\n`,
                );
              } else if (contentBlock.type === "tool_result") {
                // Send tool_result as-is
                onChunk(`${JSON.stringify(contentBlock)}\n`);
              } else {
                // Send other content types as-is
                onChunk(`${JSON.stringify(contentBlock)}\n`);
              }
            }
          } else if (typeof message.message.content === "string") {
            // Handle string content
            onChunk(
              `${JSON.stringify({ type: "text", text: message.message.content })}\n`,
            );
          }
        } else if (message.type === "system" && message.subtype === "init") {
          // Stream system initialization message as NDJSON
          onChunk(`${JSON.stringify(message)}\n`);
        } else if (message.type === "result") {
          // Stream result message as NDJSON
          onChunk(`${JSON.stringify(message)}\n`);
        }
      }

      if (messages.length === 0) {
        throw new Error("No response received from Claude Code SDK");
      }

      const queryResult: ClaudeQueryResult = this.buildQueryResult(messages);

      return ok(queryResult);
    } catch (error) {
      return err(
        new ClaudeError("Failed to stream message from Claude", error),
      );
    }
  }
}
