# Claude Code Watcher

A unified CLI tool for processing Claude Code log files and managing production servers.

## Key Features

- 🚀 **Production Server Management** - Run Next.js applications in production
- 📊 **Log File Processing** - Efficiently process Claude Code session logs
- ⚡ **Flexible Execution Modes** - One-time execution (batch) or continuous monitoring (watch)
- 📖 **Clear Help Documentation** - Detailed help for all commands
- 🎯 **Global CLI Installation** - Available system-wide after installation

## Quick Start

```bash
# 1. Install globally
npm install -g claude-code-watcher

# 2. Start production server
claude-code-watcher start

# 3. Process log files once
claude-code-watcher batch /path/to/claude-logs

# 4. Monitor and process log files continuously
claude-code-watcher watch /path/to/claude-logs
```

## Installation

### Prerequisites
- Node.js 22.x or higher
- npm or yarn

### Global Installation (Recommended)
```bash
# Install globally for system-wide access
npm install -g claude-code-watcher

# Verify installation
claude-code-watcher --version
```

### Alternative: NPX Usage
```bash
# Use without installation
npx claude-code-watcher --help
npx claude-code-watcher start --port 8080
```

## Usage

### Starting Production Server

Run the web application in production environment:

```bash
# Start on default port (3000)
claude-code-watcher start

# Start on custom port
claude-code-watcher start --port 8080
claude-code-watcher start -p 3001
```

### Log File Processing

#### One-Time Execution (Batch)
Process accumulated log files once and exit - perfect for cleaning up past logs:

```bash
# Basic usage
claude-code-watcher batch /path/to/claude-logs

# With options
claude-code-watcher batch -c 10 -p "*.jsonl" /path/to/claude-logs

# Reprocess all files including already processed ones
claude-code-watcher batch --no-skipExisting /path/to/claude-logs

# Process only specific pattern files
claude-code-watcher batch --pattern "session-*.jsonl" /path/to/claude-logs
```

#### Continuous Monitoring (Watch)
Monitor directory periodically and automatically process new files - ideal for real-time processing:

```bash
# Basic usage - check every 60 minutes (default)
claude-code-watcher watch /path/to/claude-logs

# Check every 30 minutes
claude-code-watcher watch -i 30 /path/to/claude-logs

# High-frequency processing - 20 parallel processes every 5 minutes
claude-code-watcher watch -c 20 -i 5 /path/to/claude-logs

# Monitor specific patterns every 15 minutes
claude-code-watcher watch -p "**/*.jsonl" -i 15 /path/to/claude-logs
```

## Command Reference

### Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `start` | Start production server | `claude-code-watcher start [options]` |
| `batch` | Process log files once and exit | `claude-code-watcher batch [options] [directory]` |
| `watch` | Process log files periodically | `claude-code-watcher watch [options] [directory]` |

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
claude-code-watcher batch  # Uses WATCH_TARGET_DIR

# Override environment variable
claude-code-watcher batch /custom/path
```

### .env File Configuration
For local development, create a `.env` file in the project root:

```env
WATCH_TARGET_DIR=/home/user/claude-code-logs
```

Note: This is only relevant for local development. For global CLI usage, use environment variables or command line arguments.

## Practical Usage Examples

### Production Server Operations
```bash
# Install and start production server
npm install -g claude-code-watcher
claude-code-watcher start --port 8080
```

### Log Processing Workflows

#### Bulk Processing of Past Logs
```bash
# Process large backlog of accumulated logs
claude-code-watcher batch -c 15 --no-skipExisting /archive/claude-logs
```

#### Real-time Monitoring
```bash
# Monitor active log directory every 10 minutes
claude-code-watcher watch -i 10 -c 8 /active/claude-logs
```

#### Selective File Processing
```bash
# Process only 2024 session files
claude-code-watcher batch -p "session-2024-*.jsonl" /logs/2024
```

#### High-Performance Processing
```bash
# Maximum efficiency processing for large datasets
claude-code-watcher batch -c 20 --pattern "*.jsonl" /massive-logs
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
# Check global installation
npm list -g claude-code-watcher

# Reinstall if needed
npm install -g claude-code-watcher

# Check PATH includes npm global bin
echo $PATH
```

### Permission Errors

```bash
# On Linux/macOS, you may need sudo for global install
sudo npm install -g claude-code-watcher

# Or configure npm to use different directory
npm config set prefix ~/.local
export PATH=~/.local/bin:$PATH
```

### Log Processing Errors

```bash
# Check directory exists and is readable
ls -la /path/to/claude-logs

# Verify file pattern is correct
claude-code-watcher batch --help
```

### Production Server Won't Start

```bash
# Check if port is available
lsof -i :3000

# Use different port
claude-code-watcher start --port 3001
```

### Help and Debug Information

```bash
# Show CLI version and available commands
claude-code-watcher --help

# Show help for individual commands
claude-code-watcher batch --help
claude-code-watcher watch --help
claude-code-watcher start --help
```

## Common Command Patterns

### Initial Setup
```bash
npm install -g claude-code-watcher   # Install globally
claude-code-watcher --version        # Verify operation
```

### Daily Operations
```bash
claude-code-watcher start            # Start server (port 3000)
claude-code-watcher batch ~/claude-logs # Process today's logs
claude-code-watcher watch ~/claude-logs # Start continuous monitoring
```

### Troubleshooting
```bash
claude-code-watcher --help          # Check all commands
claude-code-watcher batch --help    # Detailed batch help
npm list -g claude-code-watcher     # Check installation
```

## Development

### Local Development
For developers who want to contribute or modify this tool:

```bash
# Clone and install for development
git clone <repository-url>
cd claude-code-web
npm install

# Build CLI locally
npm run build:watcher

# Run with npm scripts (development)
npm run start:prod
npm run logs:batch -- /path/to/logs
npm run logs:watch -- /path/to/logs
```

### Publishing
```bash
# Publish to npm registry
npm publish
```

## Support

If problems persist or additional features are needed, please refer to the project documentation.

For detailed developer information, see [CLAUDE.md](./CLAUDE.md).
