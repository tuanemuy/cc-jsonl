import { Code2, Play, Terminal } from "lucide-react";

interface MessageContentProps {
  content: string;
}

interface TextContent {
  type: "text";
  text: string;
}

interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export function MessageContent({ content }: MessageContentProps) {
  let parsedContent: ContentBlock[] = [];

  try {
    if (typeof content === "string" && content.startsWith("[")) {
      parsedContent = JSON.parse(content);
    } else if (typeof content === "string") {
      parsedContent = [{ type: "text", text: content }];
    }
  } catch {
    parsedContent = [{ type: "text", text: content }];
  }

  return (
    <div className="space-y-2">
      {parsedContent.map((block, index) => {
        const key = "id" in block ? block.id : `${block.type}-${index}`;
        switch (block.type) {
          case "text":
            return (
              <div key={key} className="whitespace-pre-wrap">
                {block.text}
              </div>
            );

          case "tool_use":
            return (
              <div key={key} className="border rounded-lg p-3 bg-secondary">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground mb-2">
                  {getToolIcon(block.name)}
                  <span>Tool: {block.name}</span>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Input parameters
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                    {JSON.stringify(block.input, null, 2)}
                  </pre>
                </details>
              </div>
            );

          case "tool_result":
            return (
              <div key={key} className="border rounded-lg p-3 bg-accent">
                <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
                  <Terminal className="h-4 w-4" />
                  <span>Tool Result</span>
                </div>
                <div className="text-sm">
                  <pre className="whitespace-pre-wrap overflow-x-auto text-foreground">
                    {typeof block.content === "string"
                      ? block.content
                      : JSON.stringify(block.content, null, 2)}
                  </pre>
                </div>
              </div>
            );

          default: {
            const unknownBlock = block as { type: string };
            return (
              <div key={key} className="text-muted-foreground text-sm">
                Unsupported content type: {unknownBlock.type}
              </div>
            );
          }
        }
      })}
    </div>
  );
}

function getToolIcon(toolName: string) {
  switch (toolName) {
    case "bash":
    case "Bash":
      return <Terminal className="h-4 w-4" />;
    case "read":
    case "Read":
    case "write":
    case "Write":
    case "edit":
    case "Edit":
      return <Code2 className="h-4 w-4" />;
    default:
      return <Play className="h-4 w-4" />;
  }
}
