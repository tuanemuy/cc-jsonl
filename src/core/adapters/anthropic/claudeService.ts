import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { err, ok, type Result } from "neverthrow";
import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type { SendMessageInput, ChunkData } from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";

export class AnthropicClaudeService implements ClaudeService {
  constructor(private readonly pathToClaudeCodeExecutable?: string) {}


  async sendMessage(
    input: SendMessageInput,
  ): Promise<Result<SDKMessage[], ClaudeError>> {
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

      return ok(messages);
    } catch (error) {
      return err(new ClaudeError("Failed to send message to Claude", error));
    }
  }

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
                // Send content block object directly
                onChunk({ type: "text", text: incrementalText });
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
                // Send content block object directly
                onChunk({
                  type: "thinking",
                  content: incrementalThinking,
                });
              }
            } else {
              // Handle all other content block types (tool_use, image, document, tool_result, etc.)
              // Only send once per block
              const blockKey = `${contentBlock.type}-${JSON.stringify(contentBlock)}`;
              if (!processedBlocks.has(blockKey)) {
                processedBlocks.add(blockKey);
                onChunk(contentBlock);
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
                onChunk({ type: "text", text: contentBlock.text });
              } else if (contentBlock.type === "tool_result") {
                // Send tool_result as-is
                onChunk(contentBlock);
              } else {
                // Send other content types as-is
                onChunk(contentBlock);
              }
            }
          } else if (typeof message.message.content === "string") {
            // Handle string content
            onChunk({ type: "text", text: message.message.content });
          }
        } else if (message.type === "system" && message.subtype === "init") {
          // Stream system initialization message
          onChunk(message);
        } else if (message.type === "result") {
          // Stream result message
          onChunk(message);
        }
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
