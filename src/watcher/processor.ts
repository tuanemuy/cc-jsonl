import { readFile } from "node:fs/promises";
import type { Context } from "@/core/application/context";
import { createMessage } from "@/core/application/message";
import { createProject } from "@/core/application/project";
import { createSession } from "@/core/application/session";
import { type SessionId, sessionIdSchema } from "@/core/domain/session/types";
import { extractProjectName, extractSessionId, parseJsonLines } from "./parser";
import type { AssistantLog, ClaudeLogEntry, SystemLog, UserLog } from "./types";

export async function processLogFile(
  context: Context,
  filePath: string,
): Promise<void> {
  try {
    console.log(`Processing log file: ${filePath}`);

    const projectName = extractProjectName(filePath);
    const sessionId = extractSessionId(filePath);

    if (!projectName || !sessionId) {
      console.warn(
        `Could not extract project name or session ID from: ${filePath}`,
      );
      return;
    }

    const content = await readFile(filePath, "utf-8");
    const logEntries = parseJsonLines(content);

    if (logEntries.length === 0) {
      console.log(`No valid log entries found in: ${filePath}`);
      return;
    }

    await ensureProjectExists(context, projectName);
    await ensureSessionExists(context, projectName, sessionId);
    await processLogEntries(context, sessionId, logEntries);

    console.log(
      `Successfully processed ${logEntries.length} entries from: ${filePath}`,
    );
  } catch (error) {
    console.error(`Error processing log file ${filePath}:`, error);
  }
}

async function ensureProjectExists(
  context: Context,
  projectName: string,
): Promise<void> {
  const existingProjects = await context.projectRepository.list({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "createdAt" },
  });

  if (existingProjects.isErr()) {
    throw new Error(
      `Failed to list projects: ${existingProjects.error.message}`,
    );
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
      throw new Error(`Failed to create project: ${result.error.message}`);
    }
    console.log(`Created project: ${projectName}`);
  }
}

async function ensureSessionExists(
  context: Context,
  projectName: string,
  sessionId: string,
): Promise<void> {
  const projectsResult = await context.projectRepository.list({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "createdAt" },
  });

  if (projectsResult.isErr()) {
    throw new Error(`Failed to list projects: ${projectsResult.error.message}`);
  }

  const project = projectsResult.value.items.find(
    (p) => p.name === projectName,
  );
  if (!project) {
    throw new Error(`Project not found: ${projectName}`);
  }

  const sessionsResult = await context.sessionRepository.list({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "createdAt" },
    filter: { projectId: project.id },
  });

  if (sessionsResult.isErr()) {
    throw new Error(`Failed to list sessions: ${sessionsResult.error.message}`);
  }

  const brandedSessionId = sessionIdSchema.parse(sessionId);
  const sessionExists = sessionsResult.value.items.some(
    (s) => s.id === brandedSessionId,
  );

  if (!sessionExists) {
    const result = await createSession(context, {
      id: brandedSessionId,
      projectId: project.id,
    });
    if (result.isErr()) {
      throw new Error(`Failed to create session: ${result.error.message}`);
    }
    console.log(`Created session: ${sessionId} for project: ${projectName}`);
  }
}

async function processLogEntries(
  context: Context,
  sessionId: string,
  entries: ClaudeLogEntry[],
): Promise<void> {
  const brandedSessionId = sessionIdSchema.parse(sessionId);
  for (const entry of entries) {
    try {
      if (entry.type === "user" || entry.type === "assistant") {
        await processMessageEntry(
          context,
          brandedSessionId,
          entry as UserLog | AssistantLog,
        );
      } else if (entry.type === "system") {
        await processSystemEntry(context, brandedSessionId, entry as SystemLog);
      }
    } catch (error) {
      console.warn("Failed to process log entry:", error);
    }
  }
}

async function processMessageEntry(
  context: Context,
  sessionId: SessionId,
  entry: UserLog | AssistantLog,
): Promise<void> {
  const existingMessages = await context.messageRepository.list({
    pagination: { page: 1, limit: 1000, order: "asc", orderBy: "createdAt" },
    filter: { sessionId },
  });

  if (existingMessages.isErr()) {
    console.warn(
      `Failed to list existing messages: ${existingMessages.error.message}`,
    );
    return;
  }

  const messageExists = existingMessages.value.items.some(
    (m) => (m.rawData as { uuid?: string })?.uuid === entry.uuid,
  );

  if (messageExists) {
    return;
  }

  let content: string | null = null;

  if (entry.type === "user") {
    content =
      typeof entry.message.content === "string"
        ? entry.message.content
        : JSON.stringify(entry.message.content);
  } else if (entry.type === "assistant") {
    content = JSON.stringify(entry.message.content);
  }

  const result = await createMessage(context, {
    sessionId,
    role: entry.message.role,
    content,
    timestamp: new Date(entry.timestamp),
    rawData: JSON.stringify(entry),
  });

  if (result.isErr()) {
    console.warn(`Failed to create message: ${result.error.message}`);
  }
}

async function processSystemEntry(
  context: Context,
  sessionId: SessionId,
  entry: SystemLog,
): Promise<void> {
  const existingMessages = await context.messageRepository.list({
    pagination: { page: 1, limit: 1000, order: "asc", orderBy: "createdAt" },
    filter: { sessionId },
  });

  if (existingMessages.isErr()) {
    console.warn(
      `Failed to list existing messages: ${existingMessages.error.message}`,
    );
    return;
  }

  const messageExists = existingMessages.value.items.some(
    (m) => (m.rawData as { uuid?: string })?.uuid === entry.uuid,
  );

  if (messageExists) {
    return;
  }

  const result = await createMessage(context, {
    sessionId,
    role: "assistant",
    content: `[SYSTEM] ${entry.content}`,
    timestamp: new Date(entry.timestamp),
    rawData: JSON.stringify(entry),
  });

  if (result.isErr()) {
    console.warn(`Failed to create system message: ${result.error.message}`);
  }
}
