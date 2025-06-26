# Progress

Document current progress, issues, and next steps here.

## Completed Tasks

### 2025-06-26

- **Fixed Issue #35: sendMessageStreamの問題点の改善 (Improved sendMessageStream implementation)**
  - Task: Address architectural issues identified in PR #41
  - Problems Identified:
    - Session ID confusion between application UUIDs and Claude SDK session IDs
    - Use of `Math.random()` for content block IDs causing potential collisions
    - Missing session updates after successful Claude communication
    - Overly complex streaming implementation with unnecessary content tracking
  - Solutions Implemented:
    - Added `claudeSessionId` field to Session type to separate concerns
    - Removed `Math.random()` usage (no longer needed with simplified streaming)
    - Added session update after successful Claude communication
    - Simplified `claudeService` to directly pass SDK messages as chunks
  - Architecture Changes:
    - Updated `Session` type with nullable `claudeSessionId` field
    - Modified all repository implementations (SQLite, PgLite, Mock)
    - Simplified `ChunkData` type to be just `SDKMessage`
    - Removed unnecessary content tracking and incremental streaming logic
  - Files Modified:
    - `src/core/domain/session/types.ts`: Added claudeSessionId field
    - `src/core/adapters/drizzleSqlite/schema.ts`: Added database column
    - `src/core/adapters/drizzlePglite/schema.ts`: Added database column
    - `src/core/adapters/*/sessionRepository.ts`: Updated all implementations
    - `src/core/adapters/anthropic/claudeService.ts`: Simplified streaming
    - `src/core/domain/claude/types.ts`: Simplified ChunkData type
    - `src/core/application/claude/sendMessageStream.ts`: Added session updates
  - Testing: All 20 test cases pass, type checking successful
  - Key Insight: SDK already provides messages in appropriate granularity for streaming

### 2025-06-26

- **Completed Issue #39: CLIの実装 (CLI Implementation) + Unified Development CLI**
  - Task: Implement CLI using Gunshi library and create unified development tool
  - Implementation Phase 1 - Gunshi Migration:
    - Studied Gunshi CLI library features: declarative configuration, type safety, composability, auto usage generation
    - Replaced Node.js `parseArgs` with Gunshi in all CLI components
    - Created unified CLI with sub-commands: `batch` (one-time processing) and `watch` (periodic processing)
    - Added type-safe argument handling with automatic help generation
  - Implementation Phase 2 - Unified Development CLI:
    - Extended CLI to replace package.json scripts with unified commands
    - Integrated Next.js development workflow: `dev`, `build`, `start`
    - Added database management commands: `db generate`, `db migrate`
    - Maintained all existing watcher functionality
  - Files Modified:
    - `src/watcher/batchProcessor.ts`: Replaced parseArgs with Gunshi define/cli
    - `src/watcher/periodicBatchProcessor.ts`: Replaced parseArgs with Gunshi define/cli
    - `src/watcher/cli.ts`: Unified CLI with all development commands (NEW FILE)
    - `tsdown.config.ts`: Added new CLI entry point
  - **Unified CLI Commands:**
    - **Web Development:** `dev` (port, turbopack), `build`, `start` (port)
    - **Database:** `db generate`, `db migrate` 
    - **Log Processing:** `batch`, `watch` (existing functionality)
    - **Help System:** Comprehensive auto-generated help for all commands
  - **Key Benefits:**
    - Single CLI tool for entire development workflow
    - Replaces multiple package.json scripts with consistent interface
    - Type-safe arguments with compile-time checking
    - Process management with proper signal handling
    - Backward compatibility maintained for existing tools
  - **Usage Examples:**
    ```bash
    # Development workflow
    claude-code-watcher dev --port 3001 --no-turbo
    claude-code-watcher build
    claude-code-watcher start --port 8080
    
    # Database management
    claude-code-watcher db generate
    claude-code-watcher db migrate
    
    # Log processing
    claude-code-watcher batch -c 10 /path/to/logs
    claude-code-watcher watch -i 30 /path/to/logs
    ```
  - Testing: All TypeScript checks pass, comprehensive CLI testing completed, all commands functional

### 2025-06-24

- **Fixed Issue #18: 最新のメッセージの日時が間違っている**
  - Problem: Session's `lastMessageAt` field was not being updated consistently when messages were created
  - Root Cause: Only the `createMessage` application service was updating `lastMessageAt`, but messages created directly via repository in `processLogFile.ts` and `sendMessage.ts` were not updating it
  - Solution: Added `updateLastMessageAt` calls in both `processLogFile.ts` (for message and system entries) and `sendMessage.ts` (after creating assistant messages)
  - Files Modified:
    - `src/core/application/watcher/processLogFile.ts`: Added timestamp updates after creating messages from log entries
    - `src/core/application/claude/sendMessage.ts`: Added timestamp update after creating assistant message
  - Tests: All existing tests pass, confirming the fix doesn't break existing functionality