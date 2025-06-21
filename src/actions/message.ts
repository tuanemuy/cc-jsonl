"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/actions/context";
import type {
  CreateMessageInput,
  ListMessageQuery,
} from "@/core/application/message";
import {
  createMessage,
  getMessage,
  listMessages,
} from "@/core/application/message";

export async function createMessageAction(input: CreateMessageInput) {
  const context = getServerContext();
  const result = await createMessage(context, input);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/projects/${input.sessionId}`);
  return result.value;
}

export async function listMessagesAction(query: ListMessageQuery) {
  const context = getServerContext();
  const result = await listMessages(context, query);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function getMessageAction(id: string) {
  const context = getServerContext();
  const result = await getMessage(context, { id });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
