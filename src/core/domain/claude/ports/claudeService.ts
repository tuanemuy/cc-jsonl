import type { SDKMessage } from "@anthropic-ai/claude-code";
import type { Result } from "neverthrow";
import type { ClaudeError } from "@/lib/error";
import type { SendMessageInput, ChunkData } from "../types";

export interface ClaudeService {
  sendMessage(
    input: SendMessageInput,
  ): Promise<Result<SDKMessage[], ClaudeError>>;

  sendMessageStream(
    input: SendMessageInput,
    onChunk: (chunk: ChunkData) => void,
  ): Promise<Result<SDKMessage[], ClaudeError>>;
}
