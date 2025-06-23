"use server";

import { revalidatePath } from "next/cache";
import {
  sendMessage,
  sendMessageInputSchema,
} from "@/core/application/claude/sendMessage";
import type { FormState } from "@/lib/formState";
import { validate } from "@/lib/validation";
import { getServerContext } from "./context";

type SendMessageInput = {
  message: unknown;
  sessionId: unknown;
};

type SendMessageResult = {
  sessionId: string;
  projectId: string;
};

export async function sendMessageAction(
  _prevState: FormState<SendMessageInput, SendMessageResult>,
  formData: FormData,
): Promise<FormState<SendMessageInput, SendMessageResult>> {
  const rawData = {
    message: formData.get("message"),
    sessionId: formData.get("sessionId"),
  };

  const validation = validate(sendMessageInputSchema, rawData);
  if (validation.isErr()) {
    return {
      input: rawData,
      error: validation.error,
    };
  }

  const context = getServerContext();
  const result = await sendMessage(context, validation.value);

  if (result.isErr()) {
    return {
      input: rawData,
      error: result.error,
    };
  }

  const { session } = result.value;

  // Revalidate paths to show new data
  revalidatePath("/");
  revalidatePath(`/projects/${session.projectId}`);
  revalidatePath(`/projects/${session.projectId}/sessions/${session.id}`);

  return {
    input: rawData,
    result: {
      sessionId: session.id,
      projectId: session.projectId,
    },
    error: null,
  };
}
