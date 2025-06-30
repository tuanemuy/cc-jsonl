"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerContext } from "@/actions/context";
import type {
  CreateProjectInput,
  ListProjectQuery,
} from "@/core/application/project";
import {
  createProject,
  getProject,
  listProjects,
} from "@/core/application/project";
import {
  createProjectParamsSchema,
  projectIdSchema,
} from "@/core/domain/project/types";
import type { FormState } from "@/lib/formState";
import { validate } from "@/lib/validation";

type CreateProjectFormInput = {
  name: unknown;
  path: unknown;
};

export async function createProjectAction(
  _prevState: FormState<CreateProjectFormInput, CreateProjectInput>,
  formData: FormData,
): Promise<FormState<CreateProjectFormInput, CreateProjectInput>> {
  const rawData = {
    name: formData.get("name"),
    path: formData.get("path"),
  };

  const validation = validate(createProjectParamsSchema, rawData);
  if (validation.isErr()) {
    return {
      input: rawData,
      error: validation.error,
    };
  }

  const context = getServerContext();
  const result = await createProject(context, validation.value);

  if (result.isErr()) {
    return {
      input: rawData,
      error: result.error,
    };
  }

  revalidatePath("/");
  redirect(`/projects/${result.value.id}`);
}

export async function listProjectsAction(query?: ListProjectQuery) {
  const context = getServerContext();
  const defaultQuery = {
    pagination: {
      page: 1,
      limit: 100,
      order: "desc" as const,
      orderBy: "path",
    },
  };
  const result = await listProjects(context, query || defaultQuery);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function getProjectAction(id: string) {
  const context = getServerContext();
  const result = await getProject(context, { id: projectIdSchema.parse(id) });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
