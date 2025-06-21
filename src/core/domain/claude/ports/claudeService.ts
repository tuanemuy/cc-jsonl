import type { Result } from "neverthrow";
import type { ClaudeError } from "@/lib/error";
import type { ClaudeMessage, ClaudeResponse, SendMessageInput } from "../types";

export interface ClaudeService {
  sendMessage(
    input: SendMessageInput,
    messages: ClaudeMessage[],
  ): Promise<Result<ClaudeResponse, ClaudeError>>;

  sendMessageStream(
    input: SendMessageInput,
    messages: ClaudeMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeResponse, ClaudeError>>;
}
