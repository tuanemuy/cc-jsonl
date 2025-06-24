import { describe, expect, it } from "vitest";
import type { PermissionRequest } from "@/core/domain/authorization/types";
import { formatAllowedTool } from "./formatAllowedTool";

describe("formatAllowedTool", () => {
  it("should format Bash tool correctly", () => {
    const request: PermissionRequest = {
      toolName: "Bash",
      toolCommand: "ls -la",
      originalToolUse: {
        id: "toolu_123",
        name: "Bash",
        input: { command: "ls -la" },
      },
    };

    const result = formatAllowedTool(request);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("Bash(ls -la)");
    }
  });

  it("should format Read tool correctly", () => {
    const request: PermissionRequest = {
      toolName: "Read",
      toolCommand: "/home/user/file.txt",
      originalToolUse: {
        id: "toolu_456",
        name: "Read",
        input: { file_path: "/home/user/file.txt" },
      },
    };

    const result = formatAllowedTool(request);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("Read(/home/user/file.txt)");
    }
  });

  it("should format WebSearch tool correctly", () => {
    const request: PermissionRequest = {
      toolName: "WebSearch",
      toolCommand: "https://example.com",
      originalToolUse: {
        id: "toolu_789",
        name: "WebSearch",
        input: { url: "https://example.com" },
      },
    };

    const result = formatAllowedTool(request);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("WebSearch(https://example.com)");
    }
  });

  it("should handle commands with special characters", () => {
    const request: PermissionRequest = {
      toolName: "Bash",
      toolCommand: "grep -r 'pattern' /path/with spaces/",
      originalToolUse: {
        id: "toolu_123",
        name: "Bash",
        input: { command: "grep -r 'pattern' /path/with spaces/" },
      },
    };

    const result = formatAllowedTool(request);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("Bash(grep -r 'pattern' /path/with spaces/)");
    }
  });
});
