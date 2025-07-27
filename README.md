# Smart Context MCP Server 🎯

[![Version](https://img.shields.io/npm/v/@crisnc100/smart-context-mcp)](https://www.npmjs.com/package/@crisnc100/smart-context-mcp)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

An intelligent MCP server that learns from usage patterns to provide optimal file context selection for LLMs during coding tasks. Stop wasting tokens on irrelevant files - let Smart Context learn what's important!

## 🚀 Quick Start

See [QUICK_START.md](./QUICK_START.md) for 5-minute setup instructions.

## Features

- **Semantic Understanding**: Uses NLP to understand task intent beyond simple keyword matching
- **Task-Specific Modes**: Different strategies for debug, feature development, and refactoring tasks
- **Full Transparency**: Shows confidence scores and reasoning for every file selection
- **Progressive Loading**: Start with immediate context and expand as needed
- **Conversation Awareness**: Tracks files already viewed to avoid repetition
- **Git Integration**: Analyzes co-change patterns for better predictions (handles non-git directories gracefully)
- **Learning from Usage**: Tracks which files were actually helpful and improves over time
- **Robust Error Handling**: 
  - Gracefully handles non-git repositories
  - Skips files that exceed size limits
  - Handles malformed code files
  - Supports Unicode and special characters
  - Manages file permission errors
- **Performance Optimizations**:
  - Parallel file processing for faster scanning
  - Intelligent caching of file metadata
  - Configurable file size limits
  - Memory-efficient batch processing

## Installation

### Method 1: NPM Package (Recommended)

```bash
npm install -g @crisnc100/smart-context-mcp
```

### Method 2: Direct from GitHub

```bash
git clone https://github.com/crisnc100/smart-context-mcp.git
cd smart-context-mcp
npm install
```

### Method 3: Docker (Experimental)

```bash
docker pull smartcontext/mcp-server:latest
docker run -it -v $(pwd):/workspace:ro smartcontext/mcp-server
```

See [INSTALLATION.md](./INSTALLATION.md) for detailed setup instructions for all platforms.

## Usage

### For Claude Code CLI (Project-Specific)

Install in your project:
```bash
cd your-project
npm install @crisnc100/smart-context-mcp
```

Create `.mcp.json` in project root:
```json
{
  "mcpServers": {
    "smart-context": {
      "command": "node",
      "args": ["./node_modules/@crisnc100/smart-context-mcp/src/index.js"],
      "env": {
        "PROJECT_ROOT": "."
      }
    }
  }
}
```

See [CLAUDE_CODE_SETUP.md](./CLAUDE_CODE_SETUP.md) for detailed instructions.

### For Claude Desktop (Global)

**IMPORTANT**: Smart Context needs to know WHERE your project files are located. You must set `PROJECT_ROOT` for each project.

#### For NPM Installation:
```json
{
  "mcpServers": {
    "smart-context": {
      "command": "npx",
      "args": ["@crisnc100/smart-context-mcp"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

#### For Local Installation:
```json
{
  "mcpServers": {
    "smart-context": {
      "command": "node",
      "args": ["/path/to/smart_context_mcp/src/index.js"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

**First Time Setup?** Run the setup wizard tool in Claude:
```
Use the setup_wizard tool to check my Smart Context configuration
```

## Available Tools

### `setup_wizard` 🆕
**START HERE!** Configure Smart Context for your project.

**Parameters:**
- `action`: 'check', 'configure', or 'list'
- `projectPath`: Path to your project (for configure)
- `projectName`: Friendly name for your project

### `get_optimal_context`
Get the most relevant files for a coding task.

**Parameters:**
- `task` (required): Description of the coding task
- `currentFile`: Path to the current file being edited
- `targetTokens`: Token budget (default: 6000)
- `conversationId`: ID for conversation tracking
- `progressiveLevel`: 1=immediate, 2=expanded, 3=comprehensive
- `minRelevanceScore`: Minimum relevance threshold (0-1)

### `set_project_scope`
Configure file patterns to include/exclude for large projects.

**Parameters:**
- `name`: Name for this scope configuration
- `includePaths`: Glob patterns to include (e.g., "src/**")
- `excludePaths`: Glob patterns to exclude
- `maxDepth`: Maximum directory depth
- `activate`: Whether to activate immediately

### `record_session_outcome`
Provide feedback on which files were actually helpful.

**Parameters:**
- `sessionId` (required): Session ID from get_optimal_context
- `wasSuccessful` (required): Whether the task was completed successfully
- `filesActuallyUsed`: Array of files that were actually helpful

### `search_codebase`
Semantic search across the codebase.

**Parameters:**
- `query` (required): Natural language search query
- `limit`: Maximum results to return (default: 10)

### `get_file_relationships`
Get files related to a specific file.

**Parameters:**
- `filePath` (required): File to find relationships for
- `relationshipType`: 'import', 'git-co-change', or 'all'

### `analyze_git_patterns`
Analyze git history for file relationships.

**Parameters:**
- `commitLimit`: Number of commits to analyze (default: 100)

### `get_learning_insights`
Get insights about learned patterns.

**Parameters:**
- `taskMode`: Filter by 'debug', 'feature', or 'refactor'

### `apply_user_overrides`
Apply manual file selection adjustments for learning.

**Parameters:**
- `sessionId`: Session ID from get_optimal_context
- `added`: Files manually added
- `removed`: Files manually removed
- `kept`: Files accepted as-is

## Example Usage in Claude

```
// First time setup
Use the setup_wizard tool with action="check"

// Get context for a task
Use get_optimal_context to find files related to "fixing the user authentication flow"

// Search for specific concepts
Use search_codebase to find files containing "websocket connection handling"

// Configure for large projects
Use set_project_scope to only include src/** and exclude test files
```

## How It Works

1. **Query Analysis**: The system analyzes your task description to understand intent, concepts, and entities
2. **Multi-Factor Scoring**: Files are scored based on:
   - Semantic similarity to the task
   - Historical relevance from previous tasks
   - Task mode specific patterns
   - Import relationships
   - Git co-change history
   - Path similarity
3. **Learning**: The system tracks which files were actually helpful and adjusts future recommendations
4. **Transparency**: Every file selection includes reasoning and confidence scores

## Task Modes

- **Debug Mode**: Prioritizes recently changed files, error handlers, and test files
- **Feature Mode**: Focuses on interfaces, similar features, and type definitions  
- **Refactor Mode**: Includes all usages, dependencies, and related tests

## Configuration

The server can be configured through:

1. **Configuration file** (`config/default.json`)
2. **Local overrides** (`config/local.json`)
3. **Environment variables**

### Configuration Options

```json
{
  "context": {
    "defaultTokenBudget": 6000,
    "minRelevanceScore": 0.3,
    "progressiveLevels": {
      "immediate": 0.6,
      "expanded": 0.4,
      "comprehensive": 0.2
    }
  },
  "fileScanning": {
    "maxFileSize": 1048576,  // 1MB in bytes
    "ignorePatterns": ["node_modules/**", "*.log"]
  },
  "git": {
    "recentChangesHours": 48,
    "defaultCommitLimit": 100
  }
}
```

### Environment Variables

- `SMART_CONTEXT_TOKEN_BUDGET` - Override default token budget
- `SMART_CONTEXT_MIN_RELEVANCE` - Minimum relevance score threshold
- `SMART_CONTEXT_MAX_FILE_SIZE` - Maximum file size to scan (in bytes)
- `SMART_CONTEXT_GIT_COMMIT_LIMIT` - Number of commits to analyze

## Performance Optimization

For large projects:

1. **Use Project Scopes**: Configure include/exclude patterns with `set_project_scope`
2. **Adjust Token Budget**: Lower `targetTokens` for faster responses
3. **Set Relevance Threshold**: Increase `minRelevanceScore` to be more selective
4. **Progressive Loading**: Start with `progressiveLevel: 1` for immediate context

## Testing

Run the comprehensive test suite:

```bash
# All tests
npm run test:all

# Individual test suites
npm run test:scanner      # File scanning tests
npm run test:performance  # Performance benchmarks
npm run test:error        # Error handling tests
npm test                  # Full validation suite
```

## 📊 Performance

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed performance analysis:
- **Scanning**: ~85 files/second
- **Response**: <200ms (warm cache)
- **Memory**: ~30KB per file
- **Accuracy**: 85%+ relevance

## 🔍 How It Works

The Smart Context MCP Server uses a multi-factor scoring system:

1. **Semantic Analysis**: NLP understanding of your task
2. **Import Graph**: Traces code dependencies
3. **Git History**: Analyzes co-change patterns
4. **Learning System**: Improves from your feedback
5. **Task Modes**: Adapts strategy for debug/feature/refactor

See [COMPREHENSIVE_TEST_REPORT.md](./COMPREHENSIVE_TEST_REPORT.md) for technical details.

## 📚 Documentation

- [Installation Guide](./INSTALLATION.md) - Platform-specific setup instructions
- [Quick Start Guide](./QUICK_START.md) - Get running in 5 minutes
- [Setup Visual Guide](./SETUP_VISUAL_GUIDE.md) - Step-by-step with screenshots
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Performance Benchmarks](./BENCHMARKS.md) - Detailed performance analysis

## 🛠️ Troubleshooting

### Common Issues

**"No files found"**
- Run `setup_wizard` with `action="check"` to verify configuration
- Ensure `PROJECT_ROOT` points to your actual project directory
- Check that the directory contains code files (.js, .ts, .py, etc.)

**"Server doesn't appear in Claude"**
- Fully restart Claude Desktop (not just reload)
- Check JSON syntax in your config file
- Verify the command path exists

**Performance issues**
- Use `set_project_scope` to limit scanning area
- Reduce token budget or increase relevance threshold

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for comprehensive solutions and [Issues](https://github.com/crisnc100/smart-context-mcp/issues) for more help.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- Built for the [Model Context Protocol](https://modelcontextprotocol.io)
- Inspired by the need for smarter context in LLM-assisted coding
- Pure JavaScript implementation for maximum compatibility

---

**Ready to code smarter?** Install Smart Context and let it learn what files matter for your tasks! 🚀