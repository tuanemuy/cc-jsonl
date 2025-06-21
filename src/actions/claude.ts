"use server";

import { revalidatePath } from "next/cache";
import { sendMessage } from "@/core/application/claude/sendMessage";
import { getServerContext } from "./context";

export async function sendMessageAction(formData: FormData) {
  const message = formData.get("message") as string;
  const sessionId = formData.get("sessionId") as string | null;

  if (!message) {
    throw new Error("Message is required");
  }

  const context = getServerContext();
  const result = await sendMessage(context, {
    message,
    sessionId: sessionId || undefined,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  const { session } = result.value;

  // Revalidate paths to show new data
  revalidatePath("/");
  revalidatePath(`/projects/${session.projectId}`);
  revalidatePath(`/projects/${session.projectId}/sessions/${session.id}`);

  return {
    sessionId: session.id,
    projectId: session.projectId,
  };
}
