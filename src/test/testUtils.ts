import { MockClaudeService } from "@/core/adapters/mock/claudeService";
import { MockLogFileTrackingRepository } from "@/core/adapters/mock/logFileTrackingRepository";
import { MockMessageRepository } from "@/core/adapters/mock/messageRepository";
import { MockProjectRepository } from "@/core/adapters/mock/projectRepository";
import { MockSessionRepository } from "@/core/adapters/mock/sessionRepository";
import type { Context } from "@/core/application/context";

export function createTestContext(): Context {
  return {
    projectRepository: new MockProjectRepository(),
    sessionRepository: new MockSessionRepository(),
    messageRepository: new MockMessageRepository(),
    claudeService: new MockClaudeService(),
    logFileTrackingRepository: new MockLogFileTrackingRepository(),
  };
}
