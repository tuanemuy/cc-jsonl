import {
  type CreateProjectParams,
  type Project,
  createProjectParamsSchema,
} from "@/core/domain/project/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import type { Context } from "../context";

export type CreateProjectInput = CreateProjectParams;

export async function createProject(
  context: Context,
  input: CreateProjectInput,
): Promise<Result<Project, ApplicationError>> {
  const parseResult = validate(createProjectParamsSchema, input);

  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid project input", parseResult.error),
    );
  }

  const params = parseResult.value;

  const result = await context.projectRepository.create(params);
  return result.mapErr(
    (error) => new ApplicationError("Failed to create project", error),
  );
}
