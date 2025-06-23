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
import { createMessageParamsSchema } from "@/core/domain/message/types";
import type { FormState } from "@/lib/formState";
import { validate } from "@/lib/validation";

type CreateMessageFormInput = {
  sessionId: unknown;
  role: unknown;
  content: unknown;
};

export async function createMessageAction(
  _prevState: FormState<CreateMessageFormInput, CreateMessageInput>,
  formData: FormData,
): Promise<FormState<CreateMessageFormInput, CreateMessageInput>> {
  const rawData = {
    sessionId: formData.get("sessionId"),
    role: formData.get("role"),
    content: formData.get("content"),
  };

  const validation = validate(createMessageParamsSchema, rawData);
  if (validation.isErr()) {
    return {
      input: rawData,
      error: validation.error,
    };
  }

  const context = getServerContext();
  const result = await createMessage(context, validation.value);

  if (result.isErr()) {
    return {
      input: rawData,
      error: result.error,
    };
  }

  revalidatePath(`/projects/${validation.value.sessionId}`);

  return {
    input: rawData,
    result: result.value,
    error: null,
  };
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
