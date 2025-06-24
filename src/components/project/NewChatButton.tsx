"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ProjectId } from "@/core/domain/project/types";
import { useHaptic } from "@/hooks/use-haptic";

interface NewChatButtonProps {
  projectId?: ProjectId;
}

export function NewChatButton({ projectId: _projectId }: NewChatButtonProps) {
  const { impact } = useHaptic();
  const router = useRouter();

  const handleNewChat = () => {
    impact("medium");
    // Navigate to new chat page without creating a session
    // Session will be created when the first message is sent
    router.push("/sessions/new");
  };

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button
        onClick={handleNewChat}
        size="sm"
        className="flex items-center gap-1.5 shadow-sm"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New Chat</span>
        <span className="sm:hidden">New</span>
      </Button>
    </motion.div>
  );
}
