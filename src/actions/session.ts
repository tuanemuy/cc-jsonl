"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerContext } from "@/actions/context";
import type {
  CreateSessionInput,
  ListSessionQuery,
} from "@/core/application/session";
import {
  createSession,
  getSession,
  listSessions,
} from "@/core/application/session";
import { createSessionParamsSchema } from "@/core/domain/session/types";
import type { FormState } from "@/lib/formState";
import { validate } from "@/lib/validation";

type CreateSessionFormInput = {
  projectId: unknown;
  name: unknown;
  cwd: unknown;
};

export async function createSessionAction(
  _prevState: FormState<CreateSessionFormInput, CreateSessionInput>,
  formData: FormData,
): Promise<FormState<CreateSessionFormInput, CreateSessionInput>> {
  const rawData = {
    projectId: formData.get("projectId"),
    name: formData.get("name") || null,
    cwd: formData.get("cwd"),
  };

  const validation = validate(createSessionParamsSchema, rawData);
  if (validation.isErr()) {
    return {
      input: rawData,
      error: validation.error,
    };
  }

  const context = getServerContext();
  const result = await createSession(context, validation.value);

  if (result.isErr()) {
    return {
      input: rawData,
      error: result.error,
    };
  }

  revalidatePath(`/projects/${validation.value.projectId}`);
  redirect(
    `/projects/${validation.value.projectId}/sessions/${result.value.id}`,
  );
}

export async function listSessionsAction(query?: ListSessionQuery) {
  const context = getServerContext();
  const result = await listSessions(
    context,
    query || {
      pagination: { page: 1, limit: 100, order: "desc", orderBy: "updatedAt" },
    },
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function getSessionAction(id: string) {
  const context = getServerContext();
  const result = await getSession(context, { id });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
