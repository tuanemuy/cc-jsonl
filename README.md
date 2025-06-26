# Claude Code Watcher

Unified CLI for Claude Code production server and log processing.

## Quick Start

```bash
# Install dependencies and auto-build CLI
npm install

# Start production server
npm run start:prod

# Or with custom port
npm run start:prod -- --port 8080
```

## Log Processing

```bash
# Process log files once (1回のみ実行)
npm run logs:batch -- /path/to/logs

# Process log files periodically
npm run logs:watch -- -i 30 /path/to/logs
```

For detailed instructions, see [CLAUDE.md](./CLAUDE.md).
