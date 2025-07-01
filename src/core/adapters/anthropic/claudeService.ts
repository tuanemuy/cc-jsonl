import { execSync } from "node:child_process";
import { query } from "@anthropic-ai/claude-code";
import { err, ok, type Result } from "neverthrow";
import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type {
  AssistantContent,
  ChunkData,
  SDKMessage,
  SendMessageInput,
  UserContent,
} from "@/core/domain/claude/types";
import { ClaudeError } from "@/lib/error";
import { jsonValueSchema } from "@/lib/json";
import { validate } from "@/lib/validation";

// Get the path to the Claude Code executable using the `which claude` command
// This function uses the user's shell environment to find the executable,
// ensuring it matches what the user would get when running `which claude` in their terminal
function getClaudeCodeExecutablePath(): string | null {
  try {
    // Use user's shell and full environment to match terminal behavior
    const shell = process.env.SHELL || "/bin/bash";

    const path = execSync("which claude", {
      encoding: "utf8",
      shell,
    }).trim();

    return path || null;
  } catch (error) {
    console.warn("Failed to find claude executable path:", error);
    return null;
  }
}

export class AnthropicClaudeService implements ClaudeService {
  private readonly pathToClaudeCodeExecutable?: string;

  constructor(pathToClaudeCodeExecutable?: string) {
    // If no path is provided, try to auto-detect it
    this.pathToClaudeCodeExecutable =
      pathToClaudeCodeExecutable || getClaudeCodeExecutablePath() || undefined;
  }

  async sendMessageStream(
    input: SendMessageInput,
    onChunk: (chunk: ChunkData) => void,
  ): Promise<Result<SDKMessage[], ClaudeError>> {
    try {
      // Build options for Claude Code SDK
      const options: {
        pathToClaudeCodeExecutable?: string;
        resume?: string;
        cwd?: string;
        allowedTools?: string[];
        permissionMode?: "bypassPermissions";
      } = {
        pathToClaudeCodeExecutable: this.pathToClaudeCodeExecutable,
      };

      // Add session resume if Claude session ID is provided
      if (input.sessionId) {
        options.resume = input.sessionId;
      }

      // Add working directory if provided
      if (input.cwd) {
        options.cwd = input.cwd;
      }

      // Add allowed tools if provided
      if (input.allowedTools) {
        options.allowedTools = input.allowedTools;
      }

      // Add bypass permissions mode if provided
      if (input.bypassPermissions) {
        options.permissionMode = "bypassPermissions";
      }

      const messages: SDKMessage[] = [];

      // Simply pass each SDK message directly to onChunk
      for await (const message of query({
        prompt: input.message,
        options,
      })) {
        const customMessage = message as unknown as SDKMessage;
        messages.push(customMessage);

        // Send the entire message as a chunk
        onChunk(customMessage);
      }

      if (messages.length === 0) {
        throw new Error("No response received from Claude Code SDK");
      }

      return ok(messages);
    } catch (error) {
      return err(
        new ClaudeError("Failed to stream message from Claude", error),
      );
    }
  }

  parseAssistantContent(rawContent: string) {
    const parsed = validate(jsonValueSchema, rawContent);
    if (parsed.isErr()) {
      return err(
        new ClaudeError("Invalid assistant content format", parsed.error),
      );
    }
    if (!Array.isArray(parsed.value)) {
      return err(
        new ClaudeError("Assistant content must be an array of content blocks"),
      );
    }

    // Validate that all items are content blocks
    for (const item of parsed.value) {
      if (typeof item !== "object" || item === null || !("type" in item)) {
        return err(
          new ClaudeError("Assistant content contains invalid content block"),
        );
      }
    }

    return ok(parsed.value as unknown as AssistantContent);
  }

  parseUserContent(rawContent: string) {
    const parsed = validate(jsonValueSchema, rawContent);
    if (parsed.isErr()) {
      return err(new ClaudeError("Invalid user content format", parsed.error));
    }

    if (typeof parsed.value === "string") {
      return ok(parsed.value as unknown as UserContent);
    }

    if (Array.isArray(parsed.value)) {
      // Validate that all items in array are content block params
      for (const item of parsed.value) {
        if (typeof item !== "object" || item === null || !("type" in item)) {
          return err(
            new ClaudeError(
              "User content array contains invalid content block",
            ),
          );
        }
      }
      return ok(parsed.value as unknown as UserContent);
    }

    return err(
      new ClaudeError(
        "User content must be a string or array of content blocks",
      ),
    );
  }
}
