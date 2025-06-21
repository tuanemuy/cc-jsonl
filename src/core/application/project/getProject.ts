import { err, type Result } from "neverthrow";
import { z } from "zod/v4";
import { type Project, projectIdSchema } from "@/core/domain/project/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Context } from "../context";

export const getProjectInputSchema = z.object({
  id: projectIdSchema,
});
export type GetProjectInput = z.infer<typeof getProjectInputSchema>;

export async function getProject(
  context: Context,
  input: GetProjectInput,
): Promise<Result<Project | null, ApplicationError>> {
  const parseResult = validate(getProjectInputSchema, input);

  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid project input", parseResult.error),
    );
  }

  const result = await context.projectRepository.findById(parseResult.value.id);
  return result.mapErr(
    (error) => new ApplicationError("Failed to get project", error),
  );
}

export async function getProjectByPath(
  context: Context,
  path: string,
): Promise<Result<Project | null, ApplicationError>> {
  const result = await context.projectRepository.findByPath(path);
  return result.mapErr(
    (error) => new ApplicationError("Failed to get project by path", error),
  );
}
