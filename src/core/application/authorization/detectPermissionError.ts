import { err, ok, type Result } from "neverthrow";
import { z } from "zod/v4";
import type {
  PermissionRequest,
  ToolType,
} from "@/core/domain/authorization/types";
import { ApplicationError } from "@/lib/error";

const toolResultSchema = z.object({
  content: z.string(),
  is_error: z.boolean(),
  tool_use_id: z.string(),
});

const toolUseSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.any()),
});

export function detectPermissionError(
  toolResult: unknown,
  originalToolUse: unknown,
): Result<PermissionRequest | null, ApplicationError> {
  try {
    const parsedResult = toolResultSchema.safeParse(toolResult);
    const parsedToolUse = toolUseSchema.safeParse(originalToolUse);

    if (!parsedResult.success || !parsedToolUse.success) {
      return ok(null);
    }

    const { content, is_error } = parsedResult.data;
    const toolUse = parsedToolUse.data;

    if (!is_error) {
      return ok(null);
    }

    const permissionKeywords = [
      "requested permissions",
      "haven't granted it yet",
      "permission denied",
    ];

    const hasPermissionError = permissionKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (!hasPermissionError) {
      return ok(null);
    }

    const toolName = toolUse.name as ToolType;

    // Extract tool command based on common parameter patterns
    let toolCommand: string;
    const input = toolUse.input;

    // Try common parameter names in order of likelihood
    if (input.command) {
      toolCommand = String(input.command);
    } else if (input.file_path) {
      toolCommand = String(input.file_path);
    } else if (input.path) {
      toolCommand = String(input.path);
    } else if (input.url) {
      toolCommand = String(input.url);
    } else if (input.query) {
      toolCommand = String(input.query);
    } else if (input.text) {
      toolCommand = String(input.text);
    } else if (input.prompt) {
      toolCommand = String(input.prompt);
    } else {
      // Fallback: use first string value or JSON representation
      const firstStringValue = Object.values(input).find(
        (v) => typeof v === "string",
      );
      toolCommand = firstStringValue || JSON.stringify(input);
    }

    const permissionRequest: PermissionRequest = {
      toolName,
      toolCommand,
      originalToolUse: toolUse,
    };

    return ok(permissionRequest);
  } catch (error) {
    return err(
      new ApplicationError("Failed to detect permission error", error),
    );
  }
}
