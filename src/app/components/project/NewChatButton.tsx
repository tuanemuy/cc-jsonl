"use client";

import { createSessionAction } from "@/actions/session";
import { Button } from "@/components/ui/button";
import type { ProjectId } from "@/core/domain/project/types";
import { Plus } from "lucide-react";
import { useTransition } from "react";

interface NewChatButtonProps {
  projectId: ProjectId;
}

export function NewChatButton({ projectId }: NewChatButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleCreateSession = () => {
    startTransition(async () => {
      await createSessionAction({ projectId });
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
