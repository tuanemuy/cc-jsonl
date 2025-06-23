import { err, type Result } from "neverthrow";
import {
  type CreateProjectParams,
  createProjectParamsSchema,
  type Project,
} from "@/core/domain/project/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export type CreateProjectInput = CreateProjectParams;

export async function createProject(
  context: Context,
  input: CreateProjectInput,
): Promise<Result<Project, ApplicationError>> {
  console.log("[createProject] Starting project creation", {
    name: input.name,
    path: input.path,
  });

  const parseResult = validate(createProjectParamsSchema, input);

  if (parseResult.isErr()) {
    const error = new ApplicationError(
      "Invalid project input",
      parseResult.error,
    );
    console.error("[createProject] Validation failed", {
      error: error.message,
      cause: error.cause,
    });
    return err(error);
  }

  const params = parseResult.value;

  const result = await context.projectRepository.create(params);
  return result.mapErr((error) => {
    const appError = new ApplicationError("Failed to create project", error);
    console.error("[createProject] Repository operation failed", {
      error: appError.message,
      cause: appError.cause,
    });
    return appError;
  });
}
