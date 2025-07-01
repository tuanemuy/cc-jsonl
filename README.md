# CC.jsonl

A unified CLI tool for processing Claude Code log files and managing production servers.

## Key Features

- 🔧 **Easy Setup** - One-command initialization with XDG-compliant configuration
- 🚀 **Production Server Management** - Run Next.js applications in production
- 📊 **Log File Processing** - Efficiently process Claude Code session logs
- ⚡ **Flexible Execution Modes** - One-time execution (batch) or continuous monitoring (watch)
- 📖 **Clear Help Documentation** - Detailed help for all commands
- 🎯 **Global CLI Installation** - Available system-wide after installation

## Quick Start

```bash
# 1. Install globally
npm install -g cc-jsonl

# 2. Initialize configuration and database
cc-jsonl setup

# 3. Start production server
cc-jsonl start

# 4. Process log files once
cc-jsonl batch

# 5. Monitor and process log files continuously
cc-jsonl watch
```

## Installation

### Prerequisites
- Node.js 22.x or higher
- npm or yarn

### Global Installation (Recommended)
```bash
# Install globally for system-wide access
npm install -g cc-jsonl

# Verify installation
cc-jsonl --version
```

### Initial Setup

After installation, initialize the configuration and database:

```bash
# Initialize with default settings
cc-jsonl setup

# Initialize with custom paths and port
cc-jsonl setup --databaseFile /custom/path/data.db --watchDir /custom/logs --port 8080

# Force overwrite existing configuration (when config already exists)
cc-jsonl setup --force
```

**Configuration locations (follows XDG Base Directory specification):**
- **Config file**: `$XDG_CONFIG_HOME/cc-jsonl/settings.json` or `~/.config/cc-jsonl/settings.json`
- **Default database**: `$XDG_CONFIG_HOME/cc-jsonl/data.db` or `~/.config/cc-jsonl/data.db`
- **Default watch directory**: `$XDG_CONFIG_HOME/claude/projects` or `~/.claude/projects`

### Alternative: NPX Usage
```bash
# Use without installation
npx cc-jsonl --help
npx cc-jsonl start --port 8080
```

## Usage

### Starting Production Server

Run the web application in production environment:

```bash
# Start on default port (3000)
cc-jsonl start

# Start on custom port
cc-jsonl start --port 8080
cc-jsonl start -p 3001
```

### Log File Processing

#### One-Time Execution (Batch)
Process accumulated log files once and exit - perfect for cleaning up past logs:

```bash
# Basic usage with configured directory
cc-jsonl batch

# Process specific directory
cc-jsonl batch --targetDirectory /path/to/claude-logs

# With concurrency and pattern options
cc-jsonl batch --targetDirectory /path/to/claude-logs -c 10 -p "*.jsonl"

# Reprocess all files including already processed ones
cc-jsonl batch --targetDirectory /path/to/claude-logs --skipExisting false

# Process only specific pattern files
cc-jsonl batch --targetDirectory /path/to/claude-logs --pattern "session-*.jsonl"
```

#### Continuous Monitoring (Watch)
Monitor directory periodically and automatically process new files - ideal for real-time processing:

```bash
# Basic usage - check every 60 minutes (default) with configured directory
cc-jsonl watch

# Process specific directory every 30 minutes
cc-jsonl watch --targetDirectory /path/to/claude-logs -i 30

# High-frequency processing - 20 parallel processes every 5 minutes
cc-jsonl watch --targetDirectory /path/to/claude-logs -c 20 -i 5

# Monitor specific patterns every 15 minutes
cc-jsonl watch --targetDirectory /path/to/claude-logs -p "**/*.jsonl" -i 15
```

## Command Reference

### Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `setup` | Initialize configuration and run database migrations | `cc-jsonl setup [options]` |
| `start` | Start production server | `cc-jsonl start [options]` |
| `batch` | Process log files once and exit | `cc-jsonl batch [options]` |
| `watch` | Process log files periodically | `cc-jsonl watch [options]` |

### Global Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help message | - |
| `--version` | `-v` | Show version | - |

### Setup Command Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--databaseFile` | `-d` | Database file path | `$XDG_CONFIG_HOME/cc-jsonl/data.db` or `~/.config/cc-jsonl/data.db` |
| `--watchDir` | `-w` | Directory to watch for log files | `$XDG_CONFIG_HOME/claude/projects` or `~/.claude/projects` |
| `--port` | `-p` | Port for the production server | 3000 |
| `--force` | `-f` | Force overwrite existing configuration | false |

### Production Server Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--port` | `-p` | Server port | Uses configured port or 3000 |

### Log Processing Options

**Batch Command Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--targetDirectory` | - | Directory to process | Uses configured watch directory or WATCH_TARGET_DIR |
| `--maxConcurrency` | `-c` | Maximum concurrent processing | 5 |
| `--skipExisting` | `-s` | Skip already processed files | true |
| `--pattern` | `-p` | File pattern to match | `**/*.jsonl` |

**Watch Command Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--targetDirectory` | - | Directory to process | Uses configured watch directory or WATCH_TARGET_DIR |
| `--maxConcurrency` | `-c` | Maximum concurrent processing | 5 |
| `--skipExisting` | `-s` | Skip already processed files | true |
| `--pattern` | `-p` | File pattern to match | `**/*.jsonl` |
| `--interval` | `-i` | Processing interval in minutes | 60 |

## Configuration

### Configuration File (Recommended)

The recommended way to configure Claude Code Watcher is using the setup command, which creates a configuration file following the XDG Base Directory specification:

```bash
# Initialize configuration
cc-jsonl setup

# View current configuration
cat ~/.config/cc-jsonl/settings.json
```

**Configuration file format:**
```json
{
  "databaseFileName": "/home/user/.config/cc-jsonl/data.db",
  "watchTargetDir": "/home/user/.claude/projects",
  "port": 3000
}
```

**Configuration file locations:**
- If `$XDG_CONFIG_HOME` is set: `$XDG_CONFIG_HOME/cc-jsonl/settings.json`
- Otherwise: `~/.config/cc-jsonl/settings.json`

### Environment Variables (Development/Legacy)

```bash
# Set default directory for log processing
export WATCH_TARGET_DIR=/path/to/claude-logs

# Use environment variable (when --targetDirectory is not specified)
cc-jsonl batch  # Uses WATCH_TARGET_DIR

# Override environment variable with explicit option
cc-jsonl batch --targetDirectory /custom/path
```

### .env File Configuration
For local development, create a `.env` file in the project root:

```env
WATCH_TARGET_DIR=/home/user/claude-code-logs
```

**Note:** Environment variables are primarily for development or when you cannot use the setup command. For production use, the `setup` command is recommended as it provides persistent configuration.

## Practical Usage Examples

### First Time Setup
```bash
# Complete initialization process
npm install -g cc-jsonl
cc-jsonl setup

# Custom setup with specific paths and port
cc-jsonl setup --databaseFile /srv/data/claude.db --watchDir /var/log/claude --port 8080
```

### Production Server Operations
```bash
# Install, setup, and start production server
npm install -g cc-jsonl
cc-jsonl setup
cc-jsonl start --port 8080
```

### Log Processing Workflows

#### Bulk Processing of Past Logs
```bash
# Process large backlog of accumulated logs
cc-jsonl batch --targetDirectory /archive/claude-logs -c 15 --skipExisting false
```

#### Real-time Monitoring
```bash
# Monitor active log directory every 10 minutes
cc-jsonl watch --targetDirectory /active/claude-logs -i 10 -c 8
```

#### Selective File Processing
```bash
# Process only 2024 session files
cc-jsonl batch --targetDirectory /logs/2024 -p "session-2024-*.jsonl"
```

#### High-Performance Processing
```bash
# Maximum efficiency processing for large datasets
cc-jsonl batch --targetDirectory /massive-logs -c 20 --pattern "*.jsonl"
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
npm list -g cc-jsonl

# Reinstall if needed
npm install -g cc-jsonl

# Check PATH includes npm global bin
echo $PATH
```

### Permission Errors

```bash
# On Linux/macOS, you may need sudo for global install
sudo npm install -g cc-jsonl

# Or configure npm to use different directory
npm config set prefix ~/.local
export PATH=~/.local/bin:$PATH
```

### Log Processing Errors

```bash
# Check directory exists and is readable
ls -la /path/to/claude-logs

# Verify file pattern is correct
cc-jsonl batch --help
```

### Production Server Won't Start

```bash
# Check if port is available
lsof -i :3000

# Use different port
cc-jsonl start --port 3001
```

### Configuration Issues

```bash
# Re-run setup if configuration is corrupted
cc-jsonl setup --force

# Re-run setup with custom settings
cc-jsonl setup --databaseFile /custom/path/data.db --watchDir /custom/logs --port 8080 --force

# Check configuration file location
ls -la ~/.config/cc-jsonl/settings.json

# Verify database file exists
ls -la ~/.config/cc-jsonl/data.db

# Reset to defaults
rm ~/.config/cc-jsonl/settings.json
cc-jsonl setup
```

### Help and Debug Information

```bash
# Show CLI version and available commands
cc-jsonl --help

# Show help for individual commands
cc-jsonl setup --help
cc-jsonl batch --help
cc-jsonl watch --help
cc-jsonl start --help
```

## Common Command Patterns

### Initial Setup
```bash
npm install -g cc-jsonl   # Install globally
cc-jsonl --version        # Verify operation
cc-jsonl setup            # Initialize configuration and database
```

### Daily Operations
```bash
cc-jsonl start            # Start server (uses configured port, default 3000)
cc-jsonl batch           # Process logs (uses configured watch directory)
cc-jsonl watch           # Start continuous monitoring (uses configured directory)

# Or specify options explicitly
cc-jsonl start --port 8080
cc-jsonl batch --targetDirectory /path/to/logs
cc-jsonl watch --targetDirectory /path/to/logs --interval 30
```

### Troubleshooting
```bash
cc-jsonl --help          # Check all commands
cc-jsonl setup --help    # Detailed setup help
cc-jsonl batch --help    # Detailed batch help
npm list -g cc-jsonl     # Check installation
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
