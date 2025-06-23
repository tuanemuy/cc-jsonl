import type { ClaudeService } from "@/core/domain/claude/ports/claudeService";
import type { MessageRepository } from "@/core/domain/message/ports/messageRepository";
import type { ProjectRepository } from "@/core/domain/project/ports/projectRepository";
import type { SessionRepository } from "@/core/domain/session/ports/sessionRepository";

export interface Context {
  projectRepository: ProjectRepository;
  sessionRepository: SessionRepository;
  messageRepository: MessageRepository;
  claudeService: ClaudeService;
}
