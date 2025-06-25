import { err, ok, type Result } from "neverthrow";
import type {
  AllowedTool,
  PermissionRequest,
} from "@/core/domain/authorization/types";
import { ApplicationError } from "@/lib/error";

export function formatAllowedTool(
  request: PermissionRequest,
): Result<AllowedTool, ApplicationError> {
  try {
    const { toolName, toolCommand } = request;

    const allowedTool = `${toolName}(${toolCommand})` as AllowedTool;

    return ok(allowedTool);
  } catch (error) {
    return err(new ApplicationError("Failed to format allowed tool", error));
  }
}
