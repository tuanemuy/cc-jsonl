import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { err, ok, type Result } from "neverthrow";
import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  ClaudeMessage,
  ClaudeResponse,
  SendMessageInput,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";

export class AnthropicClaudeService implements ClaudeService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    input: SendMessageInput,
    inputMessages: ClaudeMessage[],
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    try {
      const allMessages = [
        ...inputMessages,
        { role: "user" as const, content: input.message },
      ];

      const options: { resume?: string; cwd?: string } = {};
      if (input.sessionId || input.cwd) {
        options.resume = input.sessionId;
        options.cwd = input.cwd;
      }

      const messages: SDKMessage[] = [];
      const prompt = allMessages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      for await (const message of query({
        prompt,
        ...(Object.keys(options).length > 0 && { options }),
      })) {
        messages.push(message);
      }

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) {
        throw new Error("No response received");
      }

      const claudeResponse: ClaudeResponse = {
        id: "claude-code-response",
        content: [
          {
            type: "text",
            text:
              lastMessage.type === "assistant" &&
              lastMessage.message?.content?.[0]?.type === "text"
                ? lastMessage.message.content[0].text
                : "",
          },
        ],
        role: "assistant",
        model: "claude-code",
        stop_reason: "stop",
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
      };

      return ok(claudeResponse);
    } catch (error) {
      return err(new ClaudeError("Failed to send message to Claude", error));
    }
  }

  async sendMessageStream(
    input: SendMessageInput,
    inputMessages: ClaudeMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeResponse, ClaudeError>> {
    try {
      const allMessages = [
        ...inputMessages,
        { role: "user" as const, content: input.message },
      ];

      const options: { resume?: string; cwd?: string } = {};
      if (input.sessionId || input.cwd) {
        options.resume = input.sessionId;
        options.cwd = input.cwd;
      }

      const messages: SDKMessage[] = [];
      const prompt = allMessages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      for await (const message of query({
        prompt,
        ...(Object.keys(options).length > 0 && { options }),
      })) {
        messages.push(message);
        if (
          message.type === "assistant" &&
          message.message?.content?.[0]?.type === "text"
        ) {
          onChunk(message.message.content[0].text);
        }
      }

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) {
        throw new Error("No response received");
      }

      const claudeResponse: ClaudeResponse = {
        id: "claude-code-response",
        content: [
          {
            type: "text",
            text:
              lastMessage.type === "assistant" &&
              lastMessage.message?.content?.[0]?.type === "text"
                ? lastMessage.message.content[0].text
                : "",
          },
        ],
        role: "assistant",
        model: "claude-code",
        stop_reason: "stop",
        usage: {
          input_tokens: 0,
          output_tokens: 0,
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
