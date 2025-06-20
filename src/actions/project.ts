"use server";

import { getServerContext } from "@/actions/context";
import {
  createProject,
  getProject,
  listProjects,
} from "@/core/application/project";
import type {
  CreateProjectInput,
  ListProjectQuery,
} from "@/core/application/project";
import { projectIdSchema } from "@/core/domain/project/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProjectAction(input: CreateProjectInput) {
  const context = getServerContext();
  const result = await createProject(context, input);

  if (result.isErr()) {
    throw new Error(result.error.message);
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
      orderBy: "updatedAt",
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
