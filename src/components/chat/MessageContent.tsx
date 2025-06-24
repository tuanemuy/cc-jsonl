import {
  Code2,
  FileCode,
  FileText,
  FolderOpen,
  Globe,
  ListTodo,
  LogOut,
  Notebook,
  Play,
  Search,
  SearchCode,
  Settings,
  Terminal,
} from "lucide-react";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
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
  content:
    | string
    | BashResult
    | FileResult
    | EditResult
    | FileListResult
    | TodoResult
    | WebSearchResult
    | WebFetchResult;
}

interface ThinkingContent {
  type: "thinking";
  content: string;
}

interface RedactedThinkingContent {
  type: "redacted_thinking";
}

interface ServerToolUseContent {
  type: "server_tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface WebSearchToolResultContent {
  type: "web_search_tool_result";
  tool_use_id: string;
  content: unknown;
}

// Tool result types
interface BashResult {
  stdout: string;
  stderr: string;
  interrupted: boolean;
  isImage: boolean;
  returnCodeInterpretation?: string;
}

interface FileResult {
  type: string;
  file: {
    filePath: string;
    content: string;
    numLines: number;
    startLine: number;
    totalLines: number;
  };
}

interface EditResult {
  filePath: string;
  oldString: string;
  newString: string;
  originalFile: string;
  structuredPatch?: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
  userModified: boolean;
  success: boolean;
}

interface FileListResult {
  type: "file_list";
  files: string[];
}

interface TodoResult {
  todos: Array<{
    id: string;
    content: string;
    status: string;
    priority: string;
  }>;
}

interface WebSearchResult {
  type: "web_search";
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

interface WebFetchResult {
  type: "web_fetch";
  url: string;
  title?: string;
  content: string;
}

type ContentBlock = TextContent | ToolUseContent | ToolResultContent | ThinkingContent | RedactedThinkingContent | ServerToolUseContent | WebSearchToolResultContent;

function parseTextContent(text: string): ContentBlock[] {
  // Simply return as text block without any markdown parsing
  return [{ type: "text", text }];
}

// parseStreamingContent function removed - NDJSON format handles this cleanly

export function MessageContent({
  content,
  isStreaming = false,
}: MessageContentProps) {
  // Parse content based on Claude Code SDK streaming format
  let parsedContent: ContentBlock[] = [];

  try {
    if (typeof content === "string" && content.trim()) {
      const trimmed = content.trim();

      // Check if it's a complete JSON array (final format)
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          parsedContent = JSON.parse(trimmed);
        } catch {
          // If parsing fails, treat as text
          parsedContent = parseTextContent(content);
        }
      } else {
        // During streaming, content is plain text (NDJSON is handled upstream)
        parsedContent = parseTextContent(content);
      }
    }
  } catch {
    // Fallback to plain text
    parsedContent = [{ type: "text", text: content }];
  }

  // If no parsed content, create a fallback
  if (parsedContent.length === 0) {
    parsedContent = [{ type: "text", text: content }];
  }

  return (
    <div className={`space-y-2 ${isStreaming ? "streaming" : ""}`}>
      {parsedContent.map((block, index) => {
        const key = "id" in block && typeof block.id === "string" ? block.id : `${block.type}-${index}`;
        switch (block.type) {
          case "text":
            return (
              <div key={key} className="whitespace-pre-wrap">
                {block.text}
                {isStreaming && index === parsedContent.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                )}
              </div>
            );

          case "tool_use":
            return <ToolUseDisplay key={key} block={block} />;

          case "tool_result":
            return <ToolResultDisplay key={key} block={block} />;

          case "thinking":
            return <ThinkingMessageDisplay key={key} block={block as ThinkingContent} />;

          case "redacted_thinking":
            return <RedactedThinkingDisplay key={key} />;

          case "server_tool_use":
            return <ServerToolUseDisplay key={key} block={block as ServerToolUseContent} />;

          case "web_search_tool_result":
            return <WebSearchToolResultDisplay key={key} block={block as WebSearchToolResultContent} />;

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

function ToolUseDisplay({ block }: { block: ToolUseContent }) {
  const toolInfo = getToolInfo(block.name, block.input);
  const tool = block.name.toLowerCase();

  return (
    <div className="border rounded-lg p-3 bg-secondary">
      <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground mb-2">
        {toolInfo.icon}
        <span>{toolInfo.displayName}</span>
      </div>
      {toolInfo.primaryDisplay && (
        <div className="mb-2 text-sm font-mono text-foreground bg-muted/50 p-2 rounded">
          {toolInfo.primaryDisplay}
        </div>
      )}
      {tool === "todowrite" &&
      block.input?.todos &&
      Array.isArray(block.input.todos) ? (
        <div className="mb-2 text-sm bg-muted/50 p-2 rounded space-y-1">
          {(
            block.input.todos as Array<{
              content: string;
              status: string;
              priority: string;
            }>
          ).map((todo) => (
            <div
              key={`todo-${todo.status}-${todo.content}`}
              className="flex items-center gap-2"
            >
              <span>{getStatusIcon(todo.status)}</span>
              <span className="text-foreground">{todo.content}</span>
              <span className="text-xs text-muted-foreground">
                ({todo.priority})
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          View all parameters
        </summary>
        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
          {JSON.stringify(block.input, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function ToolResultDisplay({ block }: { block: ToolResultContent }) {
  const content = block.content;

  // Handle bash results
  if (typeof content === "object" && "stdout" in content) {
    return <BashResultDisplay result={content} />;
  }

  // Handle file read results
  if (typeof content === "object" && "type" in content && "file" in content) {
    return <FileResultDisplay result={content} />;
  }

  // Handle edit results
  if (
    typeof content === "object" &&
    "filePath" in content &&
    "success" in content
  ) {
    return <EditResultDisplay result={content} />;
  }

  // Handle file list results
  if (
    typeof content === "object" &&
    "type" in content &&
    content.type === "file_list"
  ) {
    return <FileListResultDisplay result={content as FileListResult} />;
  }

  // Handle todo results
  if (typeof content === "object" && "todos" in content) {
    return <TodoResultDisplay result={content as TodoResult} />;
  }

  // Handle web search results
  if (
    typeof content === "object" &&
    "type" in content &&
    content.type === "web_search"
  ) {
    return <WebSearchResultDisplay result={content as WebSearchResult} />;
  }

  // Handle web fetch results
  if (
    typeof content === "object" &&
    "type" in content &&
    content.type === "web_fetch"
  ) {
    return <WebFetchResultDisplay result={content as WebFetchResult} />;
  }

  // Default display for string or unknown results
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <Terminal className="h-4 w-4" />
        <span>Result</span>
      </div>
      <div className="text-sm">
        <pre className="whitespace-pre-wrap overflow-x-auto text-foreground">
          {typeof content === "string"
            ? content
            : JSON.stringify(content, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function BashResultDisplay({ result }: { result: BashResult }) {
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <Terminal className="h-4 w-4" />
        <span>Command Result</span>
        {result.interrupted && (
          <span className="text-xs text-destructive">(Interrupted)</span>
        )}
      </div>
      {result.stdout && (
        <div className="text-sm mb-2">
          <pre className="whitespace-pre-wrap overflow-x-auto text-foreground">
            {result.stdout}
          </pre>
        </div>
      )}
      {result.stderr && (
        <div className="text-sm">
          <div className="text-xs text-destructive mb-1">Error output:</div>
          <pre className="whitespace-pre-wrap overflow-x-auto text-destructive">
            {result.stderr}
          </pre>
        </div>
      )}
    </div>
  );
}

function FileResultDisplay({ result }: { result: FileResult }) {
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <FileText className="h-4 w-4" />
        <span className="truncate" title={result.file.filePath}>
          {result.file.filePath}
        </span>
        <span className="text-xs text-muted-foreground">
          Lines {result.file.startLine}-
          {result.file.startLine + result.file.numLines - 1} of{" "}
          {result.file.totalLines}
        </span>
      </div>
      <div className="text-sm">
        <pre className="whitespace-pre-wrap overflow-x-auto text-foreground bg-muted p-2 rounded">
          {result.file.content}
        </pre>
      </div>
    </div>
  );
}

function EditResultDisplay({ result }: { result: EditResult }) {
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <FileCode className="h-4 w-4" />
        <span className="truncate" title={result.filePath}>
          {result.filePath}
        </span>
        {result.success ? (
          <span className="text-xs text-green-600 dark:text-green-400">
            ✓ Edited
          </span>
        ) : (
          <span className="text-xs text-destructive">✗ Failed</span>
        )}
      </div>
      {result.structuredPatch && result.structuredPatch.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View changes
          </summary>
          <div className="mt-2 space-y-2">
            {result.structuredPatch.map((patch, i) => (
              <pre
                key={`patch-${patch.oldStart}-${patch.newStart}-${i}`}
                className="whitespace-pre-wrap overflow-x-auto bg-muted p-2 rounded text-xs"
              >
                {patch.lines.join("\n")}
              </pre>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function FileListResultDisplay({ result }: { result: FileListResult }) {
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <FolderOpen className="h-4 w-4" />
        <span>Files ({result.files.length})</span>
      </div>
      <div className="text-sm max-h-64 overflow-y-auto">
        {result.files.map((file) => (
          <div
            key={file}
            className="py-0.5 hover:bg-muted/50 px-2 -mx-2 rounded"
          >
            {file}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ToolInfo {
  icon: React.ReactNode;
  displayName: string;
  primaryDisplay?: string;
}

function getToolInfo(
  toolName: string,
  input: Record<string, unknown>,
): ToolInfo {
  const tool = toolName.toLowerCase();

  switch (tool) {
    case "bash":
      return {
        icon: <Terminal className="h-4 w-4" />,
        displayName: "Bash Command",
        primaryDisplay: input?.command ? String(input.command) : undefined,
      };
    case "read":
      return {
        icon: <FileText className="h-4 w-4" />,
        displayName: "Read File",
        primaryDisplay: input?.file_path ? String(input.file_path) : undefined,
      };
    case "write":
      return {
        icon: <FileCode className="h-4 w-4" />,
        displayName: "Write File",
        primaryDisplay: input?.file_path ? String(input.file_path) : undefined,
      };
    case "edit":
    case "multiedit":
      return {
        icon: <FileCode className="h-4 w-4" />,
        displayName: tool === "edit" ? "Edit File" : "Multi-Edit File",
        primaryDisplay: input?.file_path ? String(input.file_path) : undefined,
      };
    case "grep":
      return {
        icon: <SearchCode className="h-4 w-4" />,
        displayName: "Search in Files",
        primaryDisplay: input?.pattern
          ? `Pattern: ${String(input.pattern)}${input.include ? ` in ${String(input.include)}` : ""}${input.path ? ` (${String(input.path)})` : ""}`
          : undefined,
      };
    case "glob":
      return {
        icon: <Search className="h-4 w-4" />,
        displayName: "Find Files",
        primaryDisplay: input?.pattern
          ? `${String(input.pattern)}${input.path ? ` in ${String(input.path)}` : ""}`
          : undefined,
      };
    case "ls":
      return {
        icon: <FolderOpen className="h-4 w-4" />,
        displayName: "List Directory",
        primaryDisplay: input?.path ? String(input.path) : "Current directory",
      };
    case "notebookread":
      return {
        icon: <Notebook className="h-4 w-4" />,
        displayName: "Read Notebook",
        primaryDisplay: input?.notebook_path
          ? String(input.notebook_path)
          : undefined,
      };
    case "notebookedit":
      return {
        icon: <Notebook className="h-4 w-4" />,
        displayName: "Edit Notebook",
        primaryDisplay: input?.notebook_path
          ? String(input.notebook_path)
          : undefined,
      };
    case "webfetch":
      return {
        icon: <Globe className="h-4 w-4" />,
        displayName: "Fetch Web Content",
        primaryDisplay: input?.url ? String(input.url) : undefined,
      };
    case "websearch":
      return {
        icon: <Search className="h-4 w-4" />,
        displayName: "Web Search",
        primaryDisplay: input?.query ? String(input.query) : undefined,
      };
    case "todoread":
      return {
        icon: <ListTodo className="h-4 w-4" />,
        displayName: "Read Todo List",
      };
    case "todowrite":
      return {
        icon: <ListTodo className="h-4 w-4" />,
        displayName: "Update Todo List",
        primaryDisplay: undefined,
      };
    case "task":
      return {
        icon: <Play className="h-4 w-4" />,
        displayName: "Execute Task",
        primaryDisplay: input?.description
          ? String(input.description)
          : undefined,
      };
    case "exit_plan_mode":
      return {
        icon: <LogOut className="h-4 w-4" />,
        displayName: "Exit Plan Mode",
      };
    default:
      return {
        icon: <Code2 className="h-4 w-4" />,
        displayName: toolName,
      };
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✅";
    case "in_progress":
      return "🔄";
    default:
      return "⏸️";
  }
}

function TodoResultDisplay({ result }: { result: TodoResult }) {
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <ListTodo className="h-4 w-4" />
        <span>Todo List ({result.todos.length} items)</span>
      </div>
      <div className="text-sm space-y-1">
        {result.todos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded"
          >
            <span>{getStatusIcon(todo.status)}</span>
            <span className="flex-1">{todo.content}</span>
            <span className="text-xs text-muted-foreground">
              ({todo.priority})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebSearchResultDisplay({ result }: { result: WebSearchResult }) {
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <Search className="h-4 w-4" />
        <span>Search Results for: "{result.query}"</span>
      </div>
      <div className="text-sm space-y-2">
        {result.results.map((item, i) => (
          <div
            key={`search-${i}-${item.url}`}
            className="p-2 bg-muted/50 rounded"
          >
            <div className="font-medium text-foreground">{item.title}</div>
            <div className="text-xs text-primary mb-1">{item.url}</div>
            <div className="text-xs text-muted-foreground">{item.snippet}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebFetchResultDisplay({ result }: { result: WebFetchResult }) {
  return (
    <div className="border rounded-lg p-3 bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground mb-2">
        <Globe className="h-4 w-4" />
        <span>Web Content</span>
      </div>
      {result.title && (
        <div className="text-sm font-medium mb-1">{result.title}</div>
      )}
      <div className="text-xs text-primary mb-2">{result.url}</div>
      <div className="text-sm max-h-64 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-foreground">
          {result.content}
        </pre>
      </div>
    </div>
  );
}


function ThinkingMessageDisplay({ block }: { block: ThinkingContent }) {
  return (
    <div className="border rounded-lg p-3 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
        <Settings className="h-4 w-4" />
        <span>Thinking</span>
      </div>
      <div className="text-sm">
        <div className="whitespace-pre-wrap text-purple-900 dark:text-purple-100">
          {block.content}
        </div>
      </div>
    </div>
  );
}


function RedactedThinkingDisplay() {
  return (
    <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <Settings className="h-4 w-4" />
        <span>Redacted Thinking</span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <em>This thinking content has been redacted.</em>
      </div>
    </div>
  );
}

function ServerToolUseDisplay({ block }: { block: ServerToolUseContent }) {
  const toolInfo = getToolInfo(block.name, block.input);
  
  return (
    <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
        {toolInfo.icon}
        <span>Server Tool: {toolInfo.displayName}</span>
      </div>
      {toolInfo.primaryDisplay && (
        <div className="mb-2 text-sm font-mono text-foreground bg-muted/50 p-2 rounded">
          {toolInfo.primaryDisplay}
        </div>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          View parameters
        </summary>
        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
          {JSON.stringify(block.input, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function WebSearchToolResultDisplay({ block }: { block: WebSearchToolResultContent }) {
  return (
    <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-100 mb-2">
        <Search className="h-4 w-4" />
        <span>Web Search Result</span>
      </div>
      <div className="text-sm">
        <pre className="whitespace-pre-wrap overflow-x-auto text-foreground bg-muted p-2 rounded">
          {JSON.stringify(block.content, null, 2)}
        </pre>
      </div>
    </div>
  );
}
