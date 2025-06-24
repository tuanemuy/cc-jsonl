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
    if (!["Bash", "Read", "WebSearch"].includes(toolName)) {
      return ok(null);
    }

    let toolCommand: string;
    switch (toolName) {
      case "Bash":
        toolCommand = toolUse.input.command || "";
        break;
      case "Read":
        toolCommand = toolUse.input.file_path || "";
        break;
      case "WebSearch":
        toolCommand = toolUse.input.url || "";
        break;
      default:
        return ok(null);
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
