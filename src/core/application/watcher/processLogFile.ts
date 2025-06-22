import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { type SessionId, sessionIdSchema } from "@/core/domain/session/types";
import type { LogParser } from "@/core/domain/watcher/ports/logParser";
import type {
  AssistantLog,
  ClaudeLogEntry,
  SystemLog,
  UserLog,
} from "@/core/domain/watcher/types";
import type { Context } from "../context";
import { createProject } from "../project";
import { createSession } from "../session";

export const processLogFileInputSchema = z.object({
  filePath: z.string().min(1),
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
): Promise<Result<{ entriesProcessed: number }, ProcessLogFileError>> {
  const parseResult = processLogFileInputSchema.safeParse(input);
  if (!parseResult.success) {
    return err({
      type: "PROCESS_LOG_FILE_ERROR",
      message: "Invalid input",
      cause: parseResult.error,
    });
  }

  try {
    console.log(`Processing log file: ${input.filePath}`);

    const parsedResult = await context.logParser.parseFile(input.filePath);
    if (parsedResult.isErr()) {
      const error = {
        type: "PROCESS_LOG_FILE_ERROR" as const,
        message: "Failed to parse log file",
        cause: parsedResult.error,
      };
      console.error("[processLogFile] Log file parsing failed", {
        filePath: input.filePath,
        error: error.message,
        cause: error.cause,
      });
      return err(error);
    }

    const { projectName, sessionId, entries } = parsedResult.value;

    if (entries.length === 0) {
      console.log(`No valid log entries found in: ${input.filePath}`);
      return ok({ entriesProcessed: 0 });
    }

    const ensureProjectResult = await ensureProjectExists(context, projectName);
    if (ensureProjectResult.isErr()) {
      return err(ensureProjectResult.error);
    }

    const ensureSessionResult = await ensureSessionExists(
      context,
      projectName,
      sessionId,
      entries,
    );
    if (ensureSessionResult.isErr()) {
      return err(ensureSessionResult.error);
    }

    const processEntriesResult = await processLogEntries(
      context,
      sessionId,
      entries,
    );
    if (processEntriesResult.isErr()) {
      return err(processEntriesResult.error);
    }

    console.log(
      `Successfully processed ${entries.length} entries from: ${input.filePath}`,
    );

    return ok({ entriesProcessed: entries.length });
  } catch (error) {
    const processError = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Error processing log file ${input.filePath}`,
      cause: error,
    };
    console.error("[processLogFile] Unexpected error occurred", {
      filePath: input.filePath,
      error: processError.message,
      cause: processError.cause,
    });
    return err(processError);
  }
}

async function ensureProjectExists(
  context: Context,
  projectName: string,
): Promise<Result<void, ProcessLogFileError>> {
  const existingProjects = await context.projectRepository.list({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "createdAt" },
  });

  if (existingProjects.isErr()) {
    const error = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to list projects: ${existingProjects.error.message}`,
      cause: existingProjects.error,
    };
    console.error("[ensureProjectExists] Failed to list projects", {
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  const projectExists = existingProjects.value.items.some(
    (p) => p.name === projectName,
  );

  if (!projectExists) {
    const result = await createProject(context, {
      name: projectName,
      path: projectName,
    });
    if (result.isErr()) {
      // Check if the error is due to project already existing (race condition)
      const errorCause = result.error.cause;
      const isAlreadyExistsError =
        result.error.message.includes("already exists") ||
        (errorCause &&
          typeof errorCause === "object" &&
          "message" in errorCause &&
          typeof errorCause.message === "string" &&
          errorCause.message.includes("already exists"));

      if (isAlreadyExistsError) {
        // Project was created by another concurrent operation, this is fine
        console.log(
          `Project already exists (created concurrently): ${projectName}`,
        );
      } else {
        const error = {
          type: "PROCESS_LOG_FILE_ERROR" as const,
          message: `Failed to create project: ${result.error.message}`,
          cause: result.error,
        };
        console.error("[ensureProjectExists] Project creation failed", {
          projectName,
          error: error.message,
          cause: error.cause,
        });
        return err(error);
      }
    } else {
      console.log(`Created project: ${projectName}`);
    }
  }

  return ok(undefined);
}

async function ensureSessionExists(
  context: Context,
  projectName: string,
  sessionId: string,
  logEntries: ClaudeLogEntry[],
): Promise<Result<void, ProcessLogFileError>> {
  const projectsResult = await context.projectRepository.list({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "createdAt" },
  });

  if (projectsResult.isErr()) {
    const error = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to list projects: ${projectsResult.error.message}`,
      cause: projectsResult.error,
    };
    console.error("[ensureSessionExists] Failed to list projects", {
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  const project = projectsResult.value.items.find(
    (p) => p.name === projectName,
  );
  if (!project) {
    return err({
      type: "PROCESS_LOG_FILE_ERROR",
      message: `Project not found: ${projectName}`,
    });
  }

  const sessionsResult = await context.sessionRepository.list({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "createdAt" },
    filter: { projectId: project.id },
  });

  if (sessionsResult.isErr()) {
    const error = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to list sessions: ${sessionsResult.error.message}`,
      cause: sessionsResult.error,
    };
    console.error("[ensureSessionExists] Failed to list sessions", {
      projectId: project.id,
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  const brandedSessionId = sessionIdSchema.parse(sessionId);
  const sessionExists = sessionsResult.value.items.some(
    (s) => s.id === brandedSessionId,
  );

  if (!sessionExists) {
    // Get cwd from the first log entry that has it
    const firstEntryWithCwd = logEntries.find(
      (entry) => entry.type !== "summary" && "cwd" in entry,
    );
    const cwd =
      firstEntryWithCwd && "cwd" in firstEntryWithCwd
        ? firstEntryWithCwd.cwd
        : "/tmp";

    const result = await createSession(context, {
      id: brandedSessionId,
      projectId: project.id,
      cwd,
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
        // Session was created by another concurrent operation, this is fine
        console.log(
          `Session already exists (created concurrently): ${sessionId}`,
        );
      } else {
        const error = {
          type: "PROCESS_LOG_FILE_ERROR" as const,
          message: `Failed to create session: ${result.error.message}`,
          cause: result.error,
        };
        console.error("[ensureSessionExists] Session creation failed", {
          sessionId,
          projectName,
          error: error.message,
          cause: error.cause,
        });
        return err(error);
      }
    } else {
      console.log(
        `Created session: ${sessionId} for project: ${projectName} with cwd: ${cwd}`,
      );
    }
  }

  return ok(undefined);
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
          console.warn("[processLogEntries] Failed to process message entry", {
            entryType: entry.type,
            uuid: entry.uuid,
            error: result.error.message,
            cause: result.error.cause,
          });
        }
      } else if (entry.type === "system") {
        const result = await processSystemEntry(
          context,
          brandedSessionId,
          entry as SystemLog,
        );
        if (result.isErr()) {
          console.warn("[processLogEntries] Failed to process system entry", {
            entryType: entry.type,
            uuid: entry.uuid,
            error: result.error.message,
            cause: result.error.cause,
          });
        }
      }
    } catch (error) {
      console.warn("[processLogEntries] Failed to process log entry", {
        entryType: entry.type,
        uuid: "uuid" in entry ? entry.uuid : "summary",
        error: error instanceof Error ? error.message : String(error),
        cause: error,
      });
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
    content =
      typeof entry.message.content === "string"
        ? entry.message.content
        : JSON.stringify(entry.message.content);
  } else if (entry.type === "assistant" && entry.message?.content) {
    content = JSON.stringify(entry.message.content);
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
      message: `Failed to upsert message: ${result.error.message}`,
      cause: result.error,
    };
    console.error("[processMessageEntry] Message upsert failed", {
      sessionId,
      role: entry.message?.role,
      uuid: entry.uuid,
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  // Update session cwd to match the latest message's cwd
  const sessionUpdateResult = await context.sessionRepository.updateCwd(
    sessionId,
    entry.cwd,
  );

  if (sessionUpdateResult.isErr()) {
    console.warn("[processMessageEntry] Failed to update session cwd", {
      sessionId,
      cwd: entry.cwd,
      error: sessionUpdateResult.error.message,
      cause: sessionUpdateResult.error.cause,
    });
  }

  return ok(undefined);
}

async function processSystemEntry(
  context: Context,
  sessionId: SessionId,
  entry: SystemLog,
): Promise<Result<void, ProcessLogFileError>> {
  const result = await context.messageRepository.upsert({
    sessionId,
    role: "assistant",
    content: `[SYSTEM] ${entry.content}`,
    timestamp: new Date(entry.timestamp),
    rawData: JSON.stringify(entry),
    uuid: entry.uuid,
    parentUuid: entry.parentUuid,
    cwd: entry.cwd,
  });

  if (result.isErr()) {
    const error = {
      type: "PROCESS_LOG_FILE_ERROR" as const,
      message: `Failed to upsert system message: ${result.error.message}`,
      cause: result.error,
    };
    console.error("[processSystemEntry] System message upsert failed", {
      sessionId,
      uuid: entry.uuid,
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  // Update session cwd to match the latest message's cwd
  const sessionUpdateResult = await context.sessionRepository.updateCwd(
    sessionId,
    entry.cwd,
  );

  if (sessionUpdateResult.isErr()) {
    console.warn("[processSystemEntry] Failed to update session cwd", {
      sessionId,
      cwd: entry.cwd,
      error: sessionUpdateResult.error.message,
      cause: sessionUpdateResult.error.cause,
    });
  }

  return ok(undefined);
}
