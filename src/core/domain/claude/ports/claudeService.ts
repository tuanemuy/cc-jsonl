import type { Result } from "neverthrow";
import type { ClaudeError } from "@/lib/error";
import type { ChunkData, SDKMessage, SendMessageInput } from "../types";

export interface ClaudeService {
  sendMessageStream(
    input: SendMessageInput,
    onChunk: (chunk: ChunkData) => void,
  ): Promise<Result<SDKMessage[], ClaudeError>>;
}
