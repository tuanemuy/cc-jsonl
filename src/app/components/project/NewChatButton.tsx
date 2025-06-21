"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";
import { createSessionAction } from "@/actions/session";
import { Button } from "@/components/ui/button";
import type { ProjectId } from "@/core/domain/project/types";

interface NewChatButtonProps {
  projectId: ProjectId;
}

export function NewChatButton({ projectId }: NewChatButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleCreateSession = () => {
    startTransition(async () => {
      await createSessionAction({ projectId, cwd: "/tmp" });
    });
  };

  return (
    <Button
      onClick={handleCreateSession}
      disabled={isPending}
      className="flex items-center gap-2"
    >
      <Plus className="h-4 w-4" />
      {isPending ? "Creating..." : "New Chat"}
    </Button>
  );
}
