# Claude Code Watcher

A unified CLI tool for processing Claude Code log files and managing production servers.

## Key Features

- 🚀 **Production Server Management** - Run Next.js applications in production
- 📊 **Log File Processing** - Efficiently process Claude Code session logs
- ⚡ **Flexible Execution Modes** - One-time execution (batch) or continuous monitoring (watch)
- 📖 **Clear Help Documentation** - Detailed help for all commands
- 🎯 **Easy Installation** - Ready to use immediately after `npm install`

## Quick Start

```bash
# 1. Install (CLI builds automatically)
npm install

# 2. Start production server
npm run start:prod

# 3. Process log files once
npm run logs:batch -- /path/to/claude-logs

# 4. Monitor and process log files continuously
npm run logs:watch -- /path/to/claude-logs
```

## Installation

### Prerequisites
- Node.js 22.x or higher
- npm or pnpm

### Setup
```bash
# Clone project and install
git clone <repository-url>
cd claude-code-web
npm install  # CLI builds automatically

# Verify installation
npm run cli -- --version
```

## Usage

### Starting Production Server

Run the web application in production environment:

```bash
# Start on default port (3000)
npm run start:prod

# Start on custom port
npm run start:prod -- --port 8080
npm run start:prod -- -p 3001
```

### Log File Processing

#### One-Time Execution (Batch)
Process accumulated log files once and exit - perfect for cleaning up past logs:

```bash
# Basic usage
npm run logs:batch -- /path/to/claude-logs

# With options
npm run logs:batch -- -c 10 -p "*.jsonl" /path/to/claude-logs

# Reprocess all files including already processed ones
npm run logs:batch -- --no-skipExisting /path/to/claude-logs

# Process only specific pattern files
npm run logs:batch -- --pattern "session-*.jsonl" /path/to/claude-logs
```

#### Continuous Monitoring (Watch)
Monitor directory periodically and automatically process new files - ideal for real-time processing:

```bash
# Basic usage - check every 60 minutes (default)
npm run logs:watch -- /path/to/claude-logs

# Check every 30 minutes
npm run logs:watch -- -i 30 /path/to/claude-logs

# High-frequency processing - 20 parallel processes every 5 minutes
npm run logs:watch -- -c 20 -i 5 /path/to/claude-logs

# Monitor specific patterns every 15 minutes
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
| `--targetDirectory` | - | Target directory to process | WATCH_TARGET_DIR env var |
| `--maxConcurrency` | `-c` | Maximum concurrent processing | 5 |
| `--skipExisting` | `-s` | Skip already processed files | true |
| `--pattern` | `-p` | File pattern to match | `**/*.jsonl` |
| `--interval` | `-i` | Processing interval (watch only, minutes) | 60 |

## Configuration

### Environment Variables

```bash
# Set default directory for log processing
export WATCH_TARGET_DIR=/path/to/claude-logs

# Use environment variable (when directory is not specified)
npm run logs:batch  # Uses WATCH_TARGET_DIR

# Override environment variable
npm run logs:batch -- /custom/path
```

### .env File Configuration
Create a `.env` file in the project root:

```env
WATCH_TARGET_DIR=/home/user/claude-code-logs
```

## Practical Usage Examples

### Production Server Operations
```bash
# Install and start production server
npm install
npm run start:prod -- --port 8080
```

### Log Processing Workflows

#### Bulk Processing of Past Logs
```bash
# Process large backlog of accumulated logs
npm run logs:batch -- -c 15 --no-skipExisting /archive/claude-logs
```

#### Real-time Monitoring
```bash
# Monitor active log directory every 10 minutes
npm run logs:watch -- -i 10 -c 8 /active/claude-logs
```

#### Selective File Processing
```bash
# Process only 2024 session files
npm run logs:batch -- -p "session-2024-*.jsonl" /logs/2024
```

#### High-Performance Processing
```bash
# Maximum efficiency processing for large datasets
npm run logs:batch -- -c 20 --pattern "*.jsonl" /massive-logs
```

## Performance Tuning

### Concurrency Settings
- **Low concurrency (1-5)**: For limited resources or network-constrained environments
- **Medium concurrency (5-10)**: Balanced performance for general use cases
- **High concurrency (10-20)**: Maximum throughput for high-performance systems

### File Pattern Usage
- `**/*.jsonl`: All .jsonl files recursively (default)
- `*.jsonl`: Files in target directory only
- `session-*.jsonl`: Session files only
- `{chat,session}-*.jsonl`: Multiple pattern specification

### Monitoring Interval Guidelines
- **1-5 minutes**: Real-time processing for active systems
- **15-30 minutes**: Regular monitoring for moderate activity
- **60+ minutes**: Periodic processing for low-activity systems

## Troubleshooting

### CLI Not Found After Installation

```bash
# Manually rebuild CLI
npm run build:watcher

# Verify build
ls -la dist/cli.mjs
```

### Permission Errors

```bash
# Check file permissions
ls -la dist/cli.mjs

# Grant execute permission if needed
chmod +x dist/cli.mjs
```

### Log Processing Errors

```bash
# Check directory exists and is readable
ls -la /path/to/claude-logs

# Verify file pattern is correct
npm run cli -- batch --help
```

### Production Server Won't Start

```bash
# Check if port is available
lsof -i :3000

# Use different port
npm run start:prod -- --port 3001
```

### Help and Debug Information

```bash
# Show CLI version and available commands
npm run cli -- --help

# Show help for individual commands
npm run cli -- batch --help
npm run cli -- watch --help
npm run cli -- start --help
```

## Common Command Patterns

### Initial Setup
```bash
npm install                           # Install
npm run cli -- --version            # Verify operation
```

### Daily Operations
```bash
npm run start:prod                   # Start server (port 3000)
npm run logs:batch -- ~/claude-logs # Process today's logs
npm run logs:watch -- ~/claude-logs # Start continuous monitoring
```

### Troubleshooting
```bash
npm run cli -- --help              # Check all commands
npm run build:watcher               # Rebuild CLI
npm run cli -- batch --help        # Detailed batch help
```

## Support

If problems persist or additional features are needed, please refer to the project documentation.

For detailed developer information, see [CLAUDE.md](./CLAUDE.md).
