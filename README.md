# Claude Code Watcher

A unified CLI tool for managing Claude Code production servers and processing log files with type-safe argument handling and auto-generated help documentation.

## Features

- 🚀 **Production Server Management** - Start and manage Next.js production servers
- 📊 **Intelligent Log Processing** - Process Claude Code session logs with configurable concurrency
- ⚡ **One-time or Continuous Processing** - Batch process once or watch for new files continuously
- 🔧 **Type-Safe CLI** - Built with Gunshi for compile-time argument validation
- 📖 **Auto-Generated Help** - Comprehensive help documentation for all commands
- 🎯 **Easy Installation** - Automatic CLI building on `npm install`

## Quick Start

```bash
# 1. Install dependencies (auto-builds CLI)
npm install

# 2. Start production server
npm run start:prod

# 3. Process log files once
npm run logs:batch -- /path/to/claude-logs

# 4. Watch for new log files continuously
npm run logs:watch -- /path/to/claude-logs
```

## Installation

### Prerequisites
- Node.js 22.x or higher
- npm or pnpm

### Setup
```bash
# Clone and install
git clone <repository-url>
cd claude-code-web
npm install  # Automatically builds CLI via postinstall

# Verify installation
npm run cli -- --version
```

## Usage

### Production Server

Start the Next.js production server:

```bash
# Default port (3000)
npm run start:prod

# Custom port
npm run start:prod -- --port 8080
npm run start:prod -- -p 3001

# Direct CLI usage
node dist/cli.mjs start --port 8080
```

### Log Processing

#### One-Time Processing (Batch)
Process all log files once and exit - perfect for processing accumulated logs:

```bash
# Basic usage
npm run logs:batch -- /path/to/claude-logs

# With options
npm run logs:batch -- -c 10 -p "*.jsonl" /path/to/claude-logs

# Skip already processed files (default: true)
npm run logs:batch -- --no-skipExisting /path/to/claude-logs

# Custom file pattern
npm run logs:batch -- --pattern "session-*.jsonl" /path/to/claude-logs
```

#### Continuous Processing (Watch)
Monitor directory and process new files continuously - ideal for real-time log processing:

```bash
# Basic usage - check every 60 minutes (default)
npm run logs:watch -- /path/to/claude-logs

# Custom interval - check every 30 minutes
npm run logs:watch -- -i 30 /path/to/claude-logs

# High-performance setup
npm run logs:watch -- -c 20 -i 5 /path/to/claude-logs

# Watch with custom pattern
npm run logs:watch -- -p "**/*.jsonl" -i 15 /path/to/claude-logs
```

## Command Reference

### Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `start` | Start production server | `npm run start:prod -- [options]` |
| `batch` | Process log files once and exit | `npm run logs:batch -- [options] [directory]` |
| `watch` | Process log files periodically | `npm run logs:watch -- [options] [directory]` |

### Global Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help message | - |
| `--version` | `-v` | Show version | - |

### Production Server Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--port` | `-p` | Server port | 3000 |

### Log Processing Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--targetDirectory` | - | Directory to process | WATCH_TARGET_DIR env var |
| `--maxConcurrency` | `-c` | Max concurrent file processing | 5 |
| `--skipExisting` | `-s` | Skip already processed files | true |
| `--pattern` | `-p` | File pattern to match | `**/*.jsonl` |
| `--interval` | `-i` | Processing interval (watch only) | 60 minutes |

## Configuration

### Environment Variables

```bash
# Default target directory for log processing
export WATCH_TARGET_DIR=/path/to/claude-logs

# Use environment variable
npm run logs:batch  # Uses WATCH_TARGET_DIR

# Override environment variable
npm run logs:batch -- /custom/path
```

### .env File Support
Create a `.env` file in the project root:

```env
WATCH_TARGET_DIR=/home/user/claude-code-logs
```

## Real-World Examples

### Development Workflow
```bash
# Setup and development
npm install
npm run dev  # Development server

# Production deployment
npm run build:web
npm run start:prod -- --port 8080
```

### Log Processing Workflows

#### Initial Log Import
```bash
# Process large backlog of existing logs
npm run logs:batch -- -c 15 --no-skipExisting /archive/claude-logs
```

#### Continuous Monitoring
```bash
# Monitor active log directory every 10 minutes
npm run logs:watch -- -i 10 -c 8 /active/claude-logs
```

#### Selective Processing
```bash
# Process only recent session files
npm run logs:batch -- -p "session-2024-*.jsonl" /logs/2024
```

#### High-Performance Processing
```bash
# Maximum throughput for large datasets
npm run logs:batch -- -c 20 --pattern "*.jsonl" /massive-logs
```

## Performance Tuning

### Concurrency Settings
- **Low concurrency (1-5)**: Suitable for limited resources or network-bound processing
- **Medium concurrency (5-10)**: Balanced performance for most use cases
- **High concurrency (10-20)**: Maximum throughput for powerful systems

### File Patterns
- `**/*.jsonl`: All JSON Lines files recursively (default)
- `*.jsonl`: Only files in target directory
- `session-*.jsonl`: Only session files
- `{chat,session}-*.jsonl`: Multiple patterns

### Watch Intervals
- **1-5 minutes**: Real-time processing for active systems
- **15-30 minutes**: Regular monitoring for moderate activity
- **60+ minutes**: Periodic processing for low-activity systems

## Troubleshooting

### Common Issues

#### CLI Not Found After Install
```bash
# Rebuild CLI manually
npm run build:watcher

# Verify build
ls -la dist/cli.mjs
```

#### Permission Denied
```bash
# Check file permissions
ls -la dist/cli.mjs

# Make executable if needed
chmod +x dist/cli.mjs
```

#### Log Processing Errors
```bash
# Check directory exists and is readable
ls -la /path/to/claude-logs

# Verify file pattern matches
npm run cli -- batch --help
```

#### Production Server Issues
```bash
# Check if port is available
lsof -i :3000

# Use different port
npm run start:prod -- --port 3001
```

### Debug Information
```bash
# Show CLI version and available commands
npm run cli -- --help

# Test specific command help
npm run cli -- batch --help
npm run cli -- watch --help
npm run cli -- start --help
```

## Development

### Project Structure
```
src/watcher/
├── cli.ts              # Main unified CLI
├── batchProcessor.ts   # Standalone batch processor
├── periodicBatchProcessor.ts  # Standalone watch processor
└── watcherContext.ts   # Shared context and configuration
```

### Building CLI
```bash
# Manual build
npm run build:watcher

# Auto-build on install
npm install
```

### Code Quality
```bash
# Type checking
npm run typecheck

# Linting and formatting
npm run lint:fix
npm run format

# Testing
npm run test
```

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feat/your-feature`
3. Make changes and test: `npm run typecheck && npm run lint:fix`
4. Commit changes: `git commit -m "feat: your feature"`
5. Push and create PR

## License

[Add license information]

---

For detailed development instructions, see [CLAUDE.md](./CLAUDE.md).
