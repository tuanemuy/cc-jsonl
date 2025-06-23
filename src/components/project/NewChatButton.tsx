"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { createSessionAction } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import type { ProjectId } from "@/core/domain/project/types";
import { useHaptic } from "@/hooks/use-haptic";

interface NewChatButtonProps {
  projectId: ProjectId;
}

const inputSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  cwd: z.string(),
});

type FormData = z.infer<typeof inputSchema>;

export function NewChatButton({ projectId }: NewChatButtonProps) {
  const { impact } = useHaptic();
  const form = useForm<FormData>({
    resolver: zodResolver(inputSchema),
    defaultValues: {
      projectId,
      name: "Untitled Session",
      cwd: "/tmp",
    },
  });

  const [_formState, formAction, isPending] = useActionState(
    createSessionAction,
    {
      input: { projectId, name: "Untitled Session", cwd: "/tmp" },
      error: null,
    },
  );

  const onSubmit = (data: FormData) => {
    impact("medium");
    startTransition(() => {
      const formData = new FormData();
      formData.append("projectId", data.projectId);
      formData.append("name", data.name);
      formData.append("cwd", data.cwd);
      formAction(formData);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <motion.div
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isPending ? "Creating..." : "New Chat"}
            </span>
            <span className="sm:hidden">{isPending ? "..." : "New"}</span>
          </Button>
        </motion.div>
      </form>
    </Form>
  );
}
