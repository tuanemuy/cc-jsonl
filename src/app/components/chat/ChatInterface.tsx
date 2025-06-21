"use client";

import { Bot, Loader2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/core/domain/message/types";

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }); // Remove dependency array as we want to scroll on every message update

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
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Chat with Claude
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
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
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.content}
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
        </ScrollArea>

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
      </CardContent>
    </Card>
  );
}
