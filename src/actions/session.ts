"use server";

import { getServerContext } from "@/actions/context";
import type { ListSessionQuery } from "@/core/application/session";
import { getSession, listSessions } from "@/core/application/session";

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
