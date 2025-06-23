import { err, ok, type Result } from "neverthrow";
import type { SessionId } from "@/core/domain/session/types";
import { ApplicationError } from "@/lib/error";
import type { Context } from "../context";

export async function generateSessionName(
  context: Context,
  sessionId: SessionId,
): Promise<Result<string, ApplicationError>> {
  // Get the first user message in the session
  const messagesResult = await context.messageRepository.list({
    pagination: { page: 1, limit: 5, order: "asc", orderBy: "timestamp" },
    filter: { sessionId },
  });

  if (messagesResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to fetch messages for session name generation",
        messagesResult.error,
      ),
    );
  }

  const { items } = messagesResult.value;
  if (items.length === 0) {
    return ok("Untitled Session");
  }

  // Find the first user message with meaningful content
  const firstUserMessage = items.find(
    (msg) =>
      msg.role === "user" && msg.content && msg.content.trim().length > 0,
  );

  if (firstUserMessage?.content) {
    // Use first line of user message, truncated
    const firstLine = firstUserMessage.content.split("\n")[0];
    return ok(truncateSessionName(firstLine));
  }

  return ok("Untitled Session");
}

function truncateSessionName(text: string): string {
  const maxLength = 50;
  const cleaned = text.trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.substring(0, maxLength - 3)}...`;
}
