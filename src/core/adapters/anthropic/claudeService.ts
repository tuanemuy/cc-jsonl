import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ClaudeMessage,
  ClaudeResponse,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";
import Anthropic from "@anthropic-ai/sdk";
import { type Result, err, ok } from "neverthrow";

export class AnthropicClaudeService implements ClaudeService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  async sendMessage(
    input: SendMessageInput,
    messages: ClaudeMessage[],
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    try {
      const allMessages = [
        ...messages,
        { role: "user" as const, content: input.message },
      ];

      const response = await this.client.messages.create({
        model: "claude-3-sonnet-20241022",
        max_tokens: 4000,
        messages: allMessages,
      });

      const claudeResponse: ClaudeResponse = {
        id: response.id,
        content: response.content.map((item) => ({
          type: item.type,
          text: item.type === "text" ? item.text : "",
        })),
        role: response.role,
        model: response.model,
        stop_reason: response.stop_reason,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };

      return ok(claudeResponse);
    } catch (error) {
      return err(new ClaudeError("Failed to send message to Claude", error));
    }
  }

  async sendMessageStream(
    input: SendMessageInput,
    messages: ClaudeMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    try {
      const allMessages = [
        ...messages,
        { role: "user" as const, content: input.message },
      ];

      const stream = await this.client.messages.create({
        model: "claude-3-sonnet-20241022",
        max_tokens: 4000,
        messages: allMessages,
        stream: true,
      });

      let responseContent = "";
      let responseId = "";
      let responseModel = "";
      let stopReason: string | null = null;
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        if (chunk.type === "message_start") {
          responseId = chunk.message.id;
          responseModel = chunk.message.model;
          inputTokens = chunk.message.usage.input_tokens;
        } else if (chunk.type === "content_block_delta") {
          if (chunk.delta.type === "text_delta") {
            const text = chunk.delta.text;
            responseContent += text;
            onChunk(text);
          }
        } else if (chunk.type === "message_delta") {
          stopReason = chunk.delta.stop_reason;
          outputTokens = chunk.usage?.output_tokens || 0;
        }
      }

      const claudeResponse: ClaudeResponse = {
        id: responseId,
        content: [{ type: "text", text: responseContent }],
        role: "assistant",
        model: responseModel,
        stop_reason: stopReason,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
      };

      return ok(claudeResponse);
    } catch (error) {
      return err(
        new ClaudeError("Failed to stream message from Claude", error),
      );
    }
  }
}
