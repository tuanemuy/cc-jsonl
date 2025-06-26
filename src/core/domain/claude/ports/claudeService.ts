import type { Result } from "neverthrow";
import type { ClaudeError } from "@/lib/error";
import type { ClaudeQueryResult, SendMessageInput } from "../types";

export interface ClaudeService {
  sendMessage(
    input: SendMessageInput,
  ): Promise<Result<ClaudeQueryResult, ClaudeError>>;

  sendMessageStream(
    input: SendMessageInput,
    onChunk: (chunk: string) => void,
  ): Promise<Result<ClaudeQueryResult, ClaudeError>>;
}
