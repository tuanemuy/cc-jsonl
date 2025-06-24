"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Send, Settings, User, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { detectPermissionError } from "@/core/application/authorization/detectPermissionError";
import { formatAllowedTool } from "@/core/application/authorization/formatAllowedTool";
import type { PermissionRequest } from "@/core/domain/authorization/types";
import type { Message } from "@/core/domain/message/types";
import { formatTime } from "@/lib/date";
import { MessageContent } from "./MessageContent";
import { PermissionDialog } from "./PermissionDialog";

interface ChatInterfaceProps {
  sessionId?: string;
  projectId?: string;
  initialMessages: Message[];
  cwd?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  messageType?: "init" | "result" | "thinking" | "tool_use" | "normal";
}

export function ChatInterface({
  sessionId,
  projectId: _projectId,
  initialMessages,
  cwd,
}: ChatInterfaceProps) {
  const _router = useRouter();
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      timestamp: msg.timestamp,
    })),
  );
  const [input, setInput] = useState("");
  const [currentCwd, setCurrentCwd] = useState(cwd || "");
  const [isLoading, setIsLoading] = useState(false);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingToolUse, setPendingToolUse] = useState<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getMessageIcon = (
    role: ChatMessage["role"],
    messageType?: ChatMessage["messageType"],
  ) => {
    if (role === "user") {
      return (
        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
      );
    }
    if (
      role === "system" ||
      messageType === "init" ||
      messageType === "result"
    ) {
      return <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted" />;
    }
    if (role === "tool" || messageType === "tool_use") {
      return <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted" />;
    }
    return <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted" />;
  };

  const getMessageStyle = (
    role: ChatMessage["role"],
    messageType?: ChatMessage["messageType"],
  ) => {
    if (role === "user") {
      return "bg-primary text-primary-foreground";
    }
    if (
      role === "system" ||
      messageType === "init" ||
      messageType === "result"
    ) {
      return "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800";
    }
    if (role === "tool" || messageType === "tool_use") {
      return "bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-800";
    }
    return "bg-muted";
  };

  const getAvatarStyle = (
    role: ChatMessage["role"],
    messageType?: ChatMessage["messageType"],
  ) => {
    if (role === "user") {
      return "bg-primary";
    }
    if (
      role === "system" ||
      messageType === "init" ||
      messageType === "result"
    ) {
      return "bg-blue-500";
    }
    if (role === "tool" || messageType === "tool_use") {
      return "bg-orange-500";
    }
    return "bg-muted-foreground";
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Create a URL with query parameters for GET request
      const url = new URL("/api/messages/stream", window.location.origin);
      url.searchParams.set("message", input);
      if (currentSessionId) {
        url.searchParams.set("sessionId", currentSessionId);
      }
      if (currentCwd) {
        url.searchParams.set("cwd", currentCwd);
      }

      const eventSource = new EventSource(url.toString());

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "chunk") {
            // Parse NDJSON content
            const lines = data.content
              .split("\n")
              .filter((line: string) => line.trim());

            for (const line of lines) {
              try {
                const jsonData = JSON.parse(line);

                setMessages((prev) => {
                  // Handle Claude Code SDK message types
                  let newMessage: ChatMessage;

                  // Check if this is a complete message with role and content
                  if (jsonData.role && jsonData.content) {
                    // This is a complete message (user or assistant)
                    newMessage = {
                      id: `msg-${Date.now()}-${Math.random()}`,
                      role: jsonData.role,
                      content: JSON.stringify(jsonData.content),
                      timestamp: new Date(),
                      isStreaming: false,
                    };
                  } else if (jsonData.type === "text") {
                    newMessage = {
                      id: `text-${Date.now()}-${Math.random()}`,
                      role: "assistant",
                      content: JSON.stringify([
                        { type: "text", text: jsonData.text },
                      ]),
                      timestamp: new Date(),
                      isStreaming: false,
                    };
                  } else if (jsonData.type === "thinking") {
                    newMessage = {
                      id: `thinking-${Date.now()}-${Math.random()}`,
                      role: "assistant",
                      content: JSON.stringify([
                        { type: "thinking", content: jsonData.content },
                      ]),
                      timestamp: new Date(),
                      isStreaming: false,
                    };
                  } else if (jsonData.type === "tool_use") {
                    // Store the tool use for permission checking
                    setPendingToolUse(jsonData);

                    newMessage = {
                      id: `tool-${Date.now()}-${jsonData.id || Math.random()}`,
                      role: "assistant",
                      content: JSON.stringify([jsonData]),
                      timestamp: new Date(),
                      messageType: "tool_use",
                      isStreaming: false,
                    };
                  } else if (jsonData.type === "tool_result") {
                    newMessage = {
                      id: `tool_result-${Date.now()}-${jsonData.tool_use_id || Math.random()}`,
                      role: "assistant",
                      content: JSON.stringify([jsonData]),
                      timestamp: new Date(),
                      isStreaming: false,
                    };

                    // Check for permission errors
                    if (pendingToolUse) {
                      const permissionResult = detectPermissionError(
                        jsonData,
                        pendingToolUse,
                      );
                      if (permissionResult.isOk() && permissionResult.value) {
                        setPermissionRequest(permissionResult.value);
                        setShowPermissionDialog(true);
                        eventSource.close();
                        setIsLoading(false);
                        return prev;
                      }
                      setPendingToolUse(null);
                    }
                  } else {
                    // Ignore result, system and other unknown types
                    // Result messages contain the final complete response but we already have the streamed parts
                    return prev;
                  }

                  return [...prev, newMessage];
                });
              } catch (e) {
                console.error("Failed to parse NDJSON line:", e);
              }
            }
          } else if (data.type === "complete") {
            // Close the EventSource
            eventSource.close();
            setIsLoading(false);

            // If this was a new session, update the sessionId state
            // but don't redirect to keep the user on the current page
            if (!currentSessionId && data.sessionId) {
              setCurrentSessionId(data.sessionId);
              // Update the URL to include the new session ID without navigation
              window.history.replaceState(
                null,
                "",
                `/sessions/${data.sessionId}`,
              );
            }
          } else if (data.type === "error") {
            // Create error message
            const errorMessage: ChatMessage = {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: JSON.stringify([
                { type: "text", text: `Error: ${data.error}` },
              ]),
              timestamp: new Date(),
              isStreaming: false,
            };
            setMessages((prev) => [...prev, errorMessage]);
            eventSource.close();
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Failed to parse SSE data:", e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: JSON.stringify([
          { type: "text", text: "Failed to send message. Please try again." },
        ]),
        timestamp: new Date(),
        isStreaming: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handlePermissionAllow = async () => {
    if (!permissionRequest) return;

    try {
      const allowedToolResult = formatAllowedTool(permissionRequest);
      if (allowedToolResult.isErr()) {
        console.error(
          "Failed to format allowed tool:",
          allowedToolResult.error,
        );
        return;
      }

      const allowedTool = allowedToolResult.value;

      // Send continue message with allowedTools embedded in the message
      const continueMessageContent = `continue\n\nallowedTools: ${JSON.stringify([allowedTool])}`;

      const continueMessage: ChatMessage = {
        id: `continue-${Date.now()}`,
        role: "user",
        content: continueMessageContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, continueMessage]);
      setShowPermissionDialog(false);
      setPermissionRequest(null);
      setIsLoading(true);

      // Create URL for continue request
      const url = new URL("/api/messages/stream", window.location.origin);
      url.searchParams.set("message", continueMessageContent);
      if (currentSessionId) {
        url.searchParams.set("sessionId", currentSessionId);
      }
      if (currentCwd) {
        url.searchParams.set("cwd", currentCwd);
      }

      const eventSource = new EventSource(url.toString());

      eventSource.onmessage = (event) => {
        // Reuse the same message handling logic
        try {
          const data = JSON.parse(event.data);

          if (data.type === "chunk") {
            // Handle chunk data the same way as in handleSubmit
            const lines = data.content
              .split("\n")
              .filter((line: string) => line.trim());

            for (const line of lines) {
              try {
                const jsonData = JSON.parse(line);
                setMessages((prev) => {
                  let newMessage: ChatMessage;

                  if (jsonData.role && jsonData.content) {
                    newMessage = {
                      id: `msg-${Date.now()}-${Math.random()}`,
                      role: jsonData.role,
                      content: JSON.stringify(jsonData.content),
                      timestamp: new Date(),
                      isStreaming: false,
                    };
                  } else if (jsonData.type === "text") {
                    newMessage = {
                      id: `text-${Date.now()}-${Math.random()}`,
                      role: "assistant",
                      content: JSON.stringify([
                        { type: "text", text: jsonData.text },
                      ]),
                      timestamp: new Date(),
                      isStreaming: false,
                    };
                  } else {
                    return prev;
                  }

                  return [...prev, newMessage];
                });
              } catch (e) {
                console.error("Failed to parse NDJSON line:", e);
              }
            }
          } else if (data.type === "complete") {
            eventSource.close();
            setIsLoading(false);
          } else if (data.type === "error") {
            const errorMessage: ChatMessage = {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: JSON.stringify([
                { type: "text", text: `Error: ${data.error}` },
              ]),
              timestamp: new Date(),
              isStreaming: false,
            };
            setMessages((prev) => [...prev, errorMessage]);
            eventSource.close();
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Failed to parse SSE data:", e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Failed to handle permission allow:", error);
      setIsLoading(false);
    }
  };

  const handlePermissionDeny = () => {
    setShowPermissionDialog(false);
    setPermissionRequest(null);
    setPendingToolUse(null);

    // Add a message indicating permission was denied
    const denyMessage: ChatMessage = {
      id: `deny-${Date.now()}`,
      role: "assistant",
      content: JSON.stringify([
        {
          type: "text",
          text: "Permission denied. Tool execution was blocked.",
        },
      ]),
      timestamp: new Date(),
      isStreaming: false,
    };
    setMessages((prev) => [...prev, denyMessage]);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b bg-muted/30">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
          Chat with Claude
        </h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4"
          ref={scrollRef}
        >
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex gap-2 sm:gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <motion.div
                    className="flex-shrink-0"
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 ${getAvatarStyle(message.role, message.messageType)} rounded-full flex items-center justify-center shadow-sm`}
                    >
                      {getMessageIcon(message.role, message.messageType)}
                    </div>
                  </motion.div>
                  <motion.div
                    className={`rounded-2xl px-4 py-3 sm:px-4 sm:py-3 min-w-0 shadow-sm ${getMessageStyle(message.role, message.messageType)}`}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <div className="break-words text-sm sm:text-base">
                      <MessageContent
                        content={message.content}
                        isStreaming={message.isStreaming}
                      />
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-current opacity-50 animate-pulse ml-1" />
                      )}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {formatTime(message.timestamp)}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* CWD Input for new sessions */}
          {!currentSessionId && (
            <div className="max-w-4xl mx-auto">
              <Label htmlFor="cwd" className="text-sm font-medium">
                Working Directory
              </Label>
              <Input
                id="cwd"
                value={currentCwd}
                onChange={(e) => setCurrentCwd(e.target.value)}
                placeholder="/path/to/your/project"
                className="mt-1"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-h-[56px] sm:min-h-[60px] resize-none text-sm sm:text-base"
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                }
              }}
              disabled={isLoading}
            />
            <motion.div
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="submit"
                disabled={
                  !input.trim() ||
                  isLoading ||
                  (!currentSessionId && !currentCwd.trim())
                }
                size="lg"
                className="px-4 sm:px-5 h-[56px] sm:h-[60px] rounded-full shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </div>

      {/* Permission Dialog */}
      <PermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        request={permissionRequest}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />
    </div>
  );
}
