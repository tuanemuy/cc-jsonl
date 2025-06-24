"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PermissionRequest } from "@/core/domain/authorization/types";

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PermissionRequest | null;
  onAllow: () => void;
  onDeny: () => void;
}

export function PermissionDialog({
  open,
  onOpenChange,
  request,
  onAllow,
  onDeny,
}: PermissionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!request) {
    return null;
  }

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      await onAllow();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    onDeny();
    onOpenChange(false);
  };

  const getToolDescription = (toolName: string, command: string) => {
    switch (toolName) {
      case "Bash":
        return `Execute command: ${command}`;
      case "Read":
        return `Read file: ${command}`;
      case "WebSearch":
        return `Search web: ${command}`;
      default:
        return `Use ${toolName}: ${command}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permission Required</DialogTitle>
          <DialogDescription>
            Claude Code requires permission to execute the following tool:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{request.toolName}</Badge>
            <span className="text-sm text-muted-foreground">
              {getToolDescription(request.toolName, request.toolCommand)}
            </span>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <code className="text-sm break-all">{request.toolCommand}</code>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleDeny} disabled={isLoading}>
            Deny
          </Button>
          <Button onClick={handleAllow} disabled={isLoading}>
            {isLoading ? "Allowing..." : "Allow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
