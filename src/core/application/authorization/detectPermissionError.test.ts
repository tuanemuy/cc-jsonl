import { describe, expect, it } from "vitest";
import { detectPermissionError } from "./detectPermissionError";

describe("detectPermissionError", () => {
  it("should detect permission denied error", () => {
    const toolResult = {
      content: "EACCES: permission denied, mkdir '/nonexistent/directory'",
      is_error: true,
      tool_use_id: "toolu_123",
    };

    const originalToolUse = {
      id: "toolu_123",
      name: "Bash",
      input: {
        command: "mkdir /nonexistent/directory",
      },
    };

    const result = detectPermissionError(toolResult, originalToolUse);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeDefined();
      expect(result.value?.toolName).toBe("Bash");
      expect(result.value?.toolCommand).toBe("mkdir /nonexistent/directory");
    }
  });

  it("should detect requested permissions error", () => {
    const toolResult = {
      content: "Tool has requested permissions but hasn't been granted yet",
      is_error: true,
      tool_use_id: "toolu_456",
    };

    const originalToolUse = {
      id: "toolu_456",
      name: "Read",
      input: {
        file_path: "/home/user/secret.txt",
      },
    };

    const result = detectPermissionError(toolResult, originalToolUse);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeDefined();
      expect(result.value?.toolName).toBe("Read");
      expect(result.value?.toolCommand).toBe("/home/user/secret.txt");
    }
  });

  it("should detect haven't granted it yet error", () => {
    const toolResult = {
      content: "You haven't granted it yet",
      is_error: true,
      tool_use_id: "toolu_789",
    };

    const originalToolUse = {
      id: "toolu_789",
      name: "WebSearch",
      input: {
        url: "https://example.com",
      },
    };

    const result = detectPermissionError(toolResult, originalToolUse);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeDefined();
      expect(result.value?.toolName).toBe("WebSearch");
      expect(result.value?.toolCommand).toBe("https://example.com");
    }
  });

  it("should return null for non-error tool result", () => {
    const toolResult = {
      content: "Command executed successfully",
      is_error: false,
      tool_use_id: "toolu_123",
    };

    const originalToolUse = {
      id: "toolu_123",
      name: "Bash",
      input: {
        command: "ls -la",
      },
    };

    const result = detectPermissionError(toolResult, originalToolUse);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeNull();
    }
  });

  it("should return null for error without permission keywords", () => {
    const toolResult = {
      content: "File not found",
      is_error: true,
      tool_use_id: "toolu_123",
    };

    const originalToolUse = {
      id: "toolu_123",
      name: "Read",
      input: {
        file_path: "/nonexistent/file.txt",
      },
    };

    const result = detectPermissionError(toolResult, originalToolUse);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeNull();
    }
  });

  it("should support any tool type with fallback parameter extraction", () => {
    const toolResult = {
      content: "permission denied",
      is_error: true,
      tool_use_id: "toolu_123",
    };

    const originalToolUse = {
      id: "toolu_123",
      name: "CustomTool",
      input: {
        someParam: "value",
        anotherParam: 123,
      },
    };

    const result = detectPermissionError(toolResult, originalToolUse);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeDefined();
      expect(result.value?.toolName).toBe("CustomTool");
      expect(result.value?.toolCommand).toBe("value"); // First string value
    }
  });

  it("should handle invalid input gracefully", () => {
    const result = detectPermissionError("invalid", "invalid");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeNull();
    }
  });
});
