import { MockClaudeService } from "./claudeService";
import { MockLogFileTrackingRepository } from "./logFileTrackingRepository";
import { MockMessageRepository } from "./messageRepository";
import { MockProjectRepository } from "./projectRepository";
import { MockSessionRepository } from "./sessionRepository";

export function createMockRepositories() {
  return {
    messageRepository: new MockMessageRepository(),
    projectRepository: new MockProjectRepository(),
    sessionRepository: new MockSessionRepository(),
    claudeService: new MockClaudeService(),
    logFileTrackingRepository: new MockLogFileTrackingRepository(),
  };
}
