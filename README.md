# Smart Context MCP Server 🎯

[![Version](https://img.shields.io/npm/v/@smart-context/mcp-server)](https://www.npmjs.com/package/@smart-context/mcp-server)
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

### Quick Start (Pure JavaScript - No Build Tools Required)

```bash
# This version uses pure JavaScript dependencies that don't require compilation
npm install
```

### Alternative Installation (With Native Modules)

If you want better performance and have build tools installed:

```bash
# First install build tools:
# Ubuntu/WSL2: sudo apt-get install build-essential python3-dev
# macOS: xcode-select --install

# Then use the original package.json
cp package.json.original package.json  # if you saved it
npm install
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed installation instructions and troubleshooting.

## Usage

### Start the server

```bash
npm start
```

### Use with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "smart-context": {
      "command": "node",
      "args": ["/path/to/smart-context-pruning/src/index.js"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

## Available Tools

### `get_optimal_context`
Get the most relevant files for a coding task.

**Parameters:**
- `task` (required): Description of the coding task
- `currentFile` (required): Path to the current file being edited
- `targetTokens`: Token budget (default: 6000)
- `conversationId`: ID for conversation tracking
- `progressiveLevel`: 1=immediate, 2=expanded, 3=comprehensive

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

## Example Usage

```javascript
// 1. Get optimal context for debugging
const context = await get_optimal_context({
  task: "Fix the notification system not showing after user follows someone",
  currentFile: "src/services/notification.service.ts",
  conversationId: "conv-123"
});

// 2. After completing the task, provide feedback
await record_session_outcome({
  sessionId: context.sessionId,
  wasSuccessful: true,
  filesActuallyUsed: [
    "src/services/notification.service.ts",
    "src/features/social/actions/follow.action.ts"
  ]
});
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

## Performance Tuning

For large projects, you can optimize performance by:

1. **Using the optimized scanner**:
   ```javascript
   import { OptimizedFileScanner } from './src/fileScanner-optimized.js';
   
   const scanner = new OptimizedFileScanner(projectRoot, {
     parallel: true,      // Enable parallel processing
     batchSize: 10,       // Files per batch
     maxFileSize: 512000, // 500KB limit
     enableCache: true    // Cache file metadata
   });
   ```

2. **Adjusting file size limits** to skip very large generated files
3. **Using progressive context loading** to start with essential files
4. **Enabling caching** for frequently accessed projects

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

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Quick Start Guide](./QUICK_START.md) - Get running in 5 minutes
- [Performance Benchmarks](./BENCHMARKS.md) - Detailed performance analysis
- [Test Report](./COMPREHENSIVE_TEST_REPORT.md) - Test coverage and recommendations
- [Production Ready Report](./PRODUCTION_READY_REPORT.md) - Release validation

## 🛠️ Troubleshooting

### Common Issues

**"Cannot find module"**
- Ensure you're using Node.js v16+
- Run `npm install` in the project directory

**"Files not being selected"**
- Check your `PROJECT_ROOT` path is absolute
- Verify files aren't in `.gitignore`
- Run `smart-context analyze` to debug

**"High memory usage"**
- Set `maxFileSize` limit in config
- Add more `ignorePatterns`
- Use progressive loading levels

See [Issues](https://github.com/crisnc100/smart-context-mcp/issues) for more help.

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