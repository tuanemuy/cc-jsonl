# Progress

Document current progress, issues, and next steps here.

## Completed Tasks

### 2025-06-24

- **Fixed Issue #18: 最新のメッセージの日時が間違っている**
  - Problem: Session's `lastMessageAt` field was not being updated consistently when messages were created
  - Root Cause: Only the `createMessage` application service was updating `lastMessageAt`, but messages created directly via repository in `processLogFile.ts` and `sendMessage.ts` were not updating it
  - Solution: Added `updateLastMessageAt` calls in both `processLogFile.ts` (for message and system entries) and `sendMessage.ts` (after creating assistant messages)
  - Files Modified:
    - `src/core/application/watcher/processLogFile.ts`: Added timestamp updates after creating messages from log entries
    - `src/core/application/claude/sendMessage.ts`: Added timestamp update after creating assistant message
  - Tests: All existing tests pass, confirming the fix doesn't break existing functionality