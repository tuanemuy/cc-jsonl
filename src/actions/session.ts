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

export async function createSessionAction(input: CreateSessionInput) {
  const context = getServerContext();
  const result = await createSession(context, input);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/projects/${input.projectId}`);
  redirect(`/projects/${input.projectId}/sessions/${result.value.id}`);
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
