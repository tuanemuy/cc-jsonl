"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { createSessionAction } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import type { ProjectId } from "@/core/domain/project/types";

interface NewChatButtonProps {
  projectId: ProjectId;
}

const inputSchema = z.object({
  projectId: z.string(),
  cwd: z.string(),
});

type FormData = z.infer<typeof inputSchema>;

export function NewChatButton({ projectId }: NewChatButtonProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(inputSchema),
    defaultValues: {
      projectId,
      cwd: "/tmp",
    },
  });

  const [_formState, formAction, isPending] = useActionState(
    createSessionAction,
    { input: { projectId, cwd: "/tmp" }, error: null },
  );

  const onSubmit = (data: FormData) => {
    startTransition(() => {
      const formData = new FormData();
      formData.append("projectId", data.projectId);
      formData.append("cwd", data.cwd);
      formAction(formData);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {isPending ? "Creating..." : "New Chat"}
        </Button>
      </form>
    </Form>
  );
}
