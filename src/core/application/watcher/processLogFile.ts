import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { UserContent } from "@/core/domain/claude/types";
import type { Project } from "@/core/domain/project/types";
import {
  type Session,
  type SessionId,
  sessionIdSchema,
} from "@/core/domain/session/types";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";
import type {
  AssistantLog,
  ClaudeLogEntry,
  SummaryLog,
  UserLog,
} from "@/core/domain/watcher/types";
import type { Context } from "../context";
import {
  checkFileProcessingStatus,
  updateFileProcessingStatus,
} from "./checkFileProcessingStatus";

export const processLogFileInputSchema = z.object({
  filePath: z.string().min(1),
  skipTracking: z.boolean().optional(),
});

export type ProcessLogFileInput = z.infer<typeof processLogFileInputSchema>;

export type ProcessLogFileError = {
  type: "PROCESS_LOG_FILE_ERROR";
  message: string;
  cause?: unknown;
};

export async function processLogFile(
  context: Context & { logParser: LogParser },
  input: ProcessLogFileInput,
): Promise<
  Result<{ entriesProcessed: number; skipped: boolean }, ProcessLogFileError>
> {
  const parseResult = processLogFileInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err({
      type: "PROCESS_LOG_FILE_ERROR",
      message: "Invalid input",
      cause: parseResult.error,
    });
  }

  try {
    const skipTracking = input.skipTracking ?? false;

    // Check if file needs processing (unless tracking is skipped)
    if (!skipTracking) {
      const statusResult = await checkFileProcessingStatus(context, {
        filePath: input.filePath,
      });

      if (statusResult.isErr()) {
        // Continue processing despite status check failure
      } else if (!statusResult.value.shouldProcess) {
        return ok({ entriesProcessed: 0, skipped: true });
      }
    }

    const parsedResult = await context.logParser.parseFile(input.filePath);
    if (parsedResult.isErr()) {
      const error = {
        type: "PROCESS_LOG_FILE_ERROR" as const,
        message: "Failed to parse log file",
        cause: parsedResult.error,
      };
      console.error(
        "[processLogFile] Log file parsing failed",
        {
          filePath: input.filePath,
        },
        error,
      );
      return err(error);
    }

    const { projectName, sessionId, entries } = parsedResult.value;

    if (entries.length === 0) {
      // Update tracking status even if no entries were processed
      if (!skipTracking) {
        const updateResult = await updateFileProcessingStatus(context, {
          filePath: input.filePath,
        });
        if (updateResult.isErr()) {
          // Failed to update file tracking status
        }
      }

      return ok({ entriesProcessed: 0, skipped: false });
    }

    const ensureProjectResult = await ensureProjectExists(context, projectName);
    if (ensureProjectResult.isErr()) {
      return err(ensureProjectResult.error);
    }
    const project = ensureProjectResult.value;

    const ensureSessionResult = await ensureSessionExists(
      context,
      project,
      sessionId,
    );
    if (ensureSessionResult.isErr()) {
      return err(ensureSessionResult.error);
    }
    const session = ensureSessionResult.value;

    const processEntriesResult = await processLogEntries(
      context,
      sessionId,
      entries,
    );
    if (processEntriesResult.isErr()) {
      return err(processEntriesResult.error);
    }

    // If no summary entry was found and session has no name, generate session name from messages
    const hasSummary = entries.some((entry) => entry.type === "summary");
    if (!hasSummary && session.name === null) {
      const generateNameResult = await generateAndUpdateSessionName(
        context,
        session,
      );
      if (generateNameResult.isErr()) {
        // Failed to generate session name
      }
    }

    // Update file processing tracking status
    if (!input.skipTracking) {
      const updateResult = await updateFileProcessingStatus(context, {
        filePath: input.filePath,
      });
      if (updateResult.isErr()) {
        // Failed to update file tracking status
      }
    }

    return ok({ entriesProcessed: entries.length, skipped: false });
  } catch (error) {
    const processError = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Error processing log file ${input.filePath}`,
      cause: error,
    };
    console.error(
      "[processLogFile] Unexpected error occurred",
      {
        filePath: input.filePath,
      },
      processError,
    );
    return err(processError);
  }
}

async function ensureProjectExists(
  context: Context,
  projectName: string,
): Promise<Result<Project, ProcessLogFileError>> {
  const result = await context.projectRepository.upsert({
    name: projectName,
    path: projectName,
  });

  if (result.isErr()) {
    const error = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to ensure project exists: ${result.error.message}`,
      cause: result.error,
    };
    console.error(
      "[ensureProjectExists] Project upsert failed",
      {
        projectName,
      },
      error,
    );
    return err(error);
  }

  return ok(result.value);
}

async function ensureSessionExists(
  context: Context,
  project: Project,
  sessionId: string,
): Promise<Result<Session, ProcessLogFileError>> {
  const brandedSessionId = sessionIdSchema.parse(sessionId);

  // First try to find the session by ID
  const findSessionResult =
    await context.sessionRepository.findById(brandedSessionId);
  if (findSessionResult.isErr()) {
    const error = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to find session: ${findSessionResult.error.message}`,
      cause: findSessionResult.error,
    };
    console.error(
      "[ensureSessionExists] Failed to find session",
      {
        sessionId,
      },
      error,
    );
    return err(error);
  }

  const existingSession = findSessionResult.value;

  if (!existingSession) {
    const result = await context.sessionRepository.upsert({
      id: brandedSessionId,
      projectId: project.id,
      name: null,
      cwd: "/tmp",
    });
    if (result.isErr()) {
      // Check if the error is due to session already existing (race condition)
      const errorCause = result.error.cause;
      const isAlreadyExistsError =
        result.error.message.includes("already exists") ||
        (errorCause &&
          typeof errorCause === "object" &&
          "message" in errorCause &&
          typeof errorCause.message === "string" &&
          errorCause.message.includes("already exists"));

      if (isAlreadyExistsError) {
        // Session was created by another concurrent operation, try to fetch it
        const retryResult =
          await context.sessionRepository.findById(brandedSessionId);
        if (retryResult.isOk() && retryResult.value) {
          return ok(retryResult.value);
        }
      }

      const error = {
        type: "PROCESS_LOG_FILE_ERROR" as const,
        message: `Failed to create session: ${result.error.message}`,
        cause: result.error,
      };
      console.error(
        "[ensureSessionExists] Session creation failed",
        {
          sessionId,
          projectName: project.name,
        },
        error,
      );
      return err(error);
    }
    return ok(result.value);
  }

  return ok(existingSession);
}

async function processLogEntries(
  context: Context,
  sessionId: string,
  entries: ClaudeLogEntry[],
): Promise<Result<void, ProcessLogFileError>> {
  const brandedSessionId = sessionIdSchema.parse(sessionId);
  for (const entry of entries) {
    try {
      if (entry.type === "user" || entry.type === "assistant") {
        const result = await processMessageEntry(
          context,
          brandedSessionId,
          entry as UserLog | AssistantLog,
        );
        if (result.isErr()) {
          // Failed to process message entry
        }
      } else if (entry.type === "summary") {
        const result = await processSummaryEntry(
          context,
          brandedSessionId,
          entry as SummaryLog,
        );
        if (result.isErr()) {
          // Failed to process summary entry
        }
      }
    } catch (_error) {
      // Failed to process log entry
    }
  }

  return ok(undefined);
}

async function processMessageEntry(
  context: Context,
  sessionId: SessionId,
  entry: UserLog | AssistantLog,
): Promise<Result<void, ProcessLogFileError>> {
  let content: string | null = null;

  if (entry.type === "user" && entry.message?.content) {
    // Use claude service to parse user content
    const parseResult = context.claudeService.parseUserContent(
      typeof entry.message.content === "string"
        ? entry.message.content
        : JSON.stringify(entry.message.content),
    );
    if (parseResult.isOk()) {
      content =
        typeof parseResult.value === "string"
          ? parseResult.value
          : JSON.stringify(parseResult.value);
    } else {
      // Fallback to raw content if parsing fails
      content =
        typeof entry.message.content === "string"
          ? entry.message.content
          : JSON.stringify(entry.message.content);
    }
  } else if (entry.type === "assistant" && entry.message?.content) {
    // Use claude service to parse assistant content
    const parseResult = context.claudeService.parseAssistantContent(
      JSON.stringify(entry.message.content),
    );
    if (parseResult.isOk()) {
      content = JSON.stringify(parseResult.value);
    } else {
      // Fallback to raw content if parsing fails
      content = JSON.stringify(entry.message.content);
    }
  }

  if (!entry.message?.role) {
    return err({
      type: "PROCESS_LOG_FILE_ERROR",
      message: `Invalid message entry: missing role for ${entry.type} entry`,
    });
  }

  const result = await context.messageRepository.upsert({
    sessionId,
    role: entry.message.role,
    content,
    timestamp: new Date(entry.timestamp),
    rawData: JSON.stringify(entry),
    uuid: entry.uuid,
    parentUuid: entry.parentUuid,
    cwd: entry.cwd,
  });

  if (result.isErr()) {
    const error = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to create message: ${result.error.message}`,
      cause: result.error,
    };
    console.error(
      "[processMessageEntry] Message create failed",
      {
        sessionId,
        role: entry.message?.role,
        uuid: entry.uuid,
      },
      error,
    );
    return err(error);
  }

  // Update session cwd to match the latest message's cwd
  const sessionUpdateResult = await context.sessionRepository.updateCwd(
    sessionId,
    entry.cwd,
  );

  if (sessionUpdateResult.isErr()) {
    // Failed to update session cwd
  }

  // Update session's last message timestamp
  const timestampUpdateResult =
    await context.sessionRepository.updateLastMessageAt(
      sessionId,
      new Date(entry.timestamp),
    );

  if (timestampUpdateResult.isErr()) {
    // Failed to update session lastMessageAt
  }

  return ok(undefined);
}

async function processSummaryEntry(
  context: Context,
  sessionId: SessionId,
  entry: SummaryLog,
): Promise<Result<void, ProcessLogFileError>> {
  try {
    // Generate session name from summary text
    const summaryText = entry.summary;
    if (!summaryText) {
      return ok(undefined);
    }

    // Extract a session name from the summary
    const sessionName = generateSessionNameFromSummary(summaryText);

    // Update the session name directly using the adapter
    const updateResult = await context.sessionRepository.updateName(
      sessionId,
      sessionName,
    );

    if (updateResult.isErr()) {
      const error = {
        type: "PROCESS_LOG_FILE_ERROR" as const,
        message: `Failed to update session name from summary: ${updateResult.error.message}`,
        cause: updateResult.error,
      };
      console.error(
        "[processSummaryEntry] Session name update failed",
        {
          sessionId,
          sessionName,
        },
        error,
      );
      return err(error);
    }

    return ok(undefined);
  } catch (error) {
    const processError = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to process summary entry: ${error instanceof Error ? error.message : String(error)}`,
      cause: error,
    };
    console.error(
      "[processSummaryEntry] Unexpected error",
      {
        sessionId,
      },
      processError,
    );
    return err(processError);
  }
}

function generateSessionNameFromSummary(summaryText: string): string {
  // Clean and extract meaningful text from summary
  const cleaned = summaryText.trim();

  // Extract first sentence or meaningful phrase
  const sentences = cleaned.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim();

  if (!firstSentence) {
    return "Generated Session";
  }

  // Remove common prefixes and clean up
  let name = firstSentence
    .replace(/^(Summary|Session|Chat|Conversation|Discussion):\s*/i, "")
    .replace(/^(The|This|A|An)\s+/i, "")
    .trim();

  // Truncate to reasonable length
  const maxLength = 50;
  if (name.length > maxLength) {
    name = `${name.substring(0, maxLength - 3)}...`;
  }

  return name || "Generated Session";
}

async function generateAndUpdateSessionName(
  context: Context,
  session: Session,
): Promise<Result<void, ProcessLogFileError>> {
  try {
    const sessionId = session.id;

    // Generate session name from messages using adapter directly
    const messagesResult = await context.messageRepository.list({
      pagination: { page: 1, limit: 5, order: "asc", orderBy: "timestamp" },
      filter: { sessionId },
    });

    if (messagesResult.isErr()) {
      return err({
        type: "PROCESS_LOG_FILE_ERROR",
        message: `Failed to fetch messages for session name generation: ${messagesResult.error.message}`,
        cause: messagesResult.error,
      });
    }

    const { items } = messagesResult.value;
    if (items.length === 0) {
      return ok(undefined); // No messages, no name generation needed
    }

    // Find the first user message with meaningful content
    let firstUserMessage = null;
    let processedContent = "";

    for (const msg of items) {
      if (msg.role === "user" && msg.content && msg.content.trim().length > 0) {
        // Parse user content using claude service to handle string | ContentBlockParam[] properly
        const parseResult = context.claudeService.parseUserContent(msg.content);

        if (parseResult.isOk()) {
          // Extract text from parsed content
          const extractedText = extractTextFromUserContent(parseResult.value);

          // Check if the extracted text doesn't start with < and has meaningful content
          if (
            extractedText.trim().length > 0 &&
            !extractedText.trim().startsWith("<")
          ) {
            firstUserMessage = msg;
            processedContent = extractedText;
            break;
          }
        } else {
          // Fallback: use raw content if parsing fails
          const fallbackContent =
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content);
          if (
            fallbackContent.trim().length > 0 &&
            !fallbackContent.trim().startsWith("<")
          ) {
            firstUserMessage = msg;
            processedContent = fallbackContent;
            break;
          }
        }
      }
    }

    if (!firstUserMessage || !processedContent) {
      return ok(undefined); // No meaningful content found
    }

    // Use first line of processed content, truncated
    const firstLine = processedContent.split("\n")[0]?.trim() || "";
    const sessionName = truncateSessionName(firstLine);

    // Only update if we got a meaningful name (not "Untitled Session")
    if (sessionName !== "Untitled Session") {
      const updateResult = await context.sessionRepository.updateName(
        sessionId,
        sessionName,
      );

      if (updateResult.isErr()) {
        return err({
          type: "PROCESS_LOG_FILE_ERROR",
          message: `Failed to update session name: ${updateResult.error.message}`,
          cause: updateResult.error,
        });
      }
    }

    return ok(undefined);
  } catch (error) {
    return err({
      type: "PROCESS_LOG_FILE_ERROR",
      message: `Failed to generate and update session name: ${error instanceof Error ? error.message : String(error)}`,
      cause: error,
    });
  }
}

function truncateSessionName(text: string): string {
  const maxLength = 50;
  const cleaned = text.trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.substring(0, maxLength - 3)}...`;
}

function extractTextFromUserContent(content: UserContent): string {
  if (typeof content === "string") {
    return content;
  }

  // Handle ContentBlockParam[] case
  if (Array.isArray(content)) {
    const textParts: string[] = [];
    for (const block of content) {
      if (typeof block === "object" && block !== null) {
        if (
          block.type === "text" &&
          "text" in block &&
          typeof block.text === "string"
        ) {
          textParts.push(block.text);
        } else if (
          block.type === "tool_use" &&
          "name" in block &&
          typeof block.name === "string"
        ) {
          // For tool use blocks, include the tool name for context
          textParts.push(`[Tool: ${block.name}]`);
        }
      }
    }
    return textParts.join(" ");
  }

  return "";
}
