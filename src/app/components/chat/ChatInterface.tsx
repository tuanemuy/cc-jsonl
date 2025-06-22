"use client";

import { Bot, Loader2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/core/domain/message/types";
import { MessageContent } from "./MessageContent";

interface ChatInterfaceProps {
  sessionId: string;
  projectId: string;
  initialMessages: Message[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function ChatInterface({
  sessionId,
  projectId: _projectId,
  initialMessages,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      timestamp: msg.timestamp,
    })),
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // TODO: Fix linter warning about exhaustive-deps
  // biome-ignore lint: react-hooks/exhaustive-deps
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]); // Scroll when messages change

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "chunk") {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content += data.content;
                  }
                  return newMessages;
                });
              } else if (data.type === "complete") {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.isStreaming = false;
                    lastMessage.id = data.messageId;
                  }
                  return newMessages;
                });
                // Refresh the page to show updated data
                window.location.reload();
              } else if (data.type === "error") {
                console.error("Streaming error:", data.error);
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = `Error: ${data.error}`;
                    lastMessage.isStreaming = false;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content = "Failed to send message. Please try again.";
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[600px] border rounded-lg bg-card text-card-foreground shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-6 pb-2 border-b">
        <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Chat with Claude
        </h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden p-6 pb-4">
        <div className="h-full overflow-y-auto space-y-4 pr-2" ref={scrollRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div className="flex-shrink-0">
                  {message.role === "user" ? (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-muted-foreground rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-muted" />
                    </div>
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-2 min-w-0 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="break-words">
                    <MessageContent content={message.content} />
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current opacity-50 animate-pulse ml-1" />
                    )}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-6 pt-2 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[60px] resize-none"
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit({ preventDefault: () => {} } as React.FormEvent);
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
