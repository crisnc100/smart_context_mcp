# Smart Context MCP Server 🎯 - AI Context Engineer

[![Version](https://img.shields.io/npm/v/@crisnc100/smart-context-mcp)](https://www.npmjs.com/package/@crisnc100/smart-context-mcp)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

**🚀 Version 2.0.0 - Major Update!** Smart Context has evolved from a file selector to a comprehensive **AI Context Engineer** that generates complete context packages for LLMs. Transform vague queries into structured, actionable context with code, relationships, and insights.

## 🎯 What's New in v2.0.0

### From File Selector to AI Context Engineer
Smart Context now acts as your personal AI Context Engineer, solving a critical problem: **users often don't provide enough context for AI tools to work effectively**. Instead of just suggesting files, it now:

- **Extracts actual code** from functions and relevant sections
- **Maps relationships** between files through imports/exports
- **Recognizes error patterns** and suggests fixes
- **Generates structured packages** optimized for AI consumption
- **Works alongside grep** to enhance, not replace, traditional search

### New Tool: `generate_context_package`
The flagship feature that transforms any query into a complete context package:
```javascript
// Before v2.0.0: Just file paths
["src/cart.js", "src/checkout.js"]

// After v2.0.0: Complete context with code
{
  "context": {
    "coreImplementation": {
      "code": "const getTotalPrice = () => { ... }",
      "function": "getTotalPrice",
      "lines": "48-56"
    }
  },
  "relationships": {
    "dependencies": [...],
    "provides": [...]
  },
  "suggestedFix": {
    "pattern": "NaN in calculation",
    "suggestion": "Check if item.price is undefined"
  }
}
```

## 🚀 Quick Start

**New to Smart Context?** Follow our [5-minute setup guide](./QUICK_START.md) to get started right away!

**Already familiar with MCP?** Jump to [Installation](#installation) below.

## ✨ Key Features

- **🧠 Semantic Understanding**: Uses NLP to understand what you're trying to accomplish, not just keywords
- **🎯 Task-Specific Modes**: Automatically adapts strategy for debugging, feature development, and refactoring
- **📊 Full Transparency**: See confidence scores and reasoning behind every file recommendation
- **📈 Progressive Loading**: Start with immediate context, expand when you need more
- **💬 Conversation Awareness**: Remembers what files you've already seen to avoid repetition
- **🔗 Git Integration**: Learns from your commit history to predict related files
- **🎓 Learning from Usage**: Gets smarter over time by tracking which files actually helped you
- **🛡️ Robust Error Handling**: 
  - Works with any project (Git or non-Git)
  - Gracefully skips large or problematic files
  - Handles Unicode and special characters
  - Never crashes on file permission issues
- **⚡ Performance Optimized**:
  - Fast parallel file processing (~85 files/second)
  - Smart caching for instant responses
  - Configurable limits to control resource usage
  - Memory-efficient for large codebases

## 📦 Installation

Choose the method that works best for you:

### 🌟 Method 1: NPM Package (Recommended)
**Easiest for most users**
```bash
npm install -g @crisnc100/smart-context-mcp
```

### 🔧 Method 2: Direct from GitHub
**For developers who want the latest code**
```bash
git clone https://github.com/crisnc100/smart-context-mcp.git
cd smart-context-mcp
npm install
```

### 🐳 Method 3: Docker (Experimental)
**For containerized deployments**
```bash
docker pull smartcontext/mcp-server:latest
docker run -it -v $(pwd):/workspace:ro smartcontext/mcp-server
```

📋 **Need detailed setup instructions?** See our comprehensive [Installation Guide](./INSTALLATION.md) for platform-specific instructions.

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

### For Codex CLI (OpenAI)

**IMPORTANT**: Codex CLI uses `mcp_servers` (underscore) rather than `mcpServers` (camelCase).

#### For NPM Installation (TOML format):
```toml
[mcp_servers.smart-context]
command = "npx"
args = ["-y", "@crisnc100/smart-context-mcp"]
env = { "PROJECT_ROOT" = "/path/to/your/project" }
```

#### For Local Installation (TOML format):
```toml
[mcp_servers.smart-context]
command = "node"
args = ["/path/to/smart_context_mcp/src/index.js"]
env = { "PROJECT_ROOT" = "/path/to/your/project" }
```

**First Time Setup?** Run the setup wizard tool in Claude:
```
Use the setup_wizard tool to check my Smart Context configuration
```

## 🛠️ Available Tools

### 🎯 `setup_wizard` - **START HERE!**
Configure Smart Context for your project. This is your first step!

**What it does:** Checks your configuration and helps set up Smart Context properly.

**Key parameters:**
- `action`: Choose 'check' to verify setup, 'configure' to set up a new project
- `projectPath`: Where your code lives
- `projectName`: A friendly name for your project

### 🚀 `generate_context_package` - **AI Context Engineer** (New in v2.0.0!)
Generate a complete context package with code, relationships, and insights for any task.

**What it does:** Acts as your AI Context Engineer - analyzes your query, extracts actual code, maps dependencies, and provides structured context that helps AI tools understand your codebase better.

**Key parameters:**
- `query` (required): Natural language description of your task
- `currentFile`: The file you're working on (optional)
- `tokenBudget`: Maximum tokens to use (default: 6000)

**Returns:** A structured context package containing:
- **Understanding**: What the AI understood from your query
- **Context**: Actual code extracted from relevant sections
- **Relationships**: Import/export dependencies and connections
- **Suggested Fix**: Pattern-based fix suggestions for common issues
- **Summary**: Task mode, confidence, and reasoning

**Example - Debugging:**
```javascript
// Query: "getTotalPrice returns NaN when cart has items"
{
  "understanding": {
    "problemDescription": "getTotalPrice function returns NaN",
    "concepts": ["pricing", "cart", "calculation"],
    "entities": ["getTotalPrice", "cart", "items"]
  },
  "context": {
    "coreImplementation": {
      "file": "src/context/CartContext.js",
      "function": "getTotalPrice",
      "lines": "48-56",
      "code": "const getTotalPrice = () => {\n  return cartItems.reduce((total, item) => {\n    return total + (item.price * item.quantity);\n  }, 0).toFixed(2);\n};"
    }
  },
  "suggestedFix": {
    "pattern": "NaN in calculation",
    "confidence": 0.8,
    "suggestion": "Check if item.price or item.quantity are undefined/null"
  }
}
```

**Example - Feature Development:**
```javascript
// Query: "add discount code feature to shopping cart"
{
  "understanding": {
    "taskType": "feature",
    "components": ["discount", "cart", "validation"],
    "relatedFeatures": ["pricing", "checkout"]
  },
  "relationships": {
    "dependencies": [
      {"file": "CartContext.js", "imports": ["useState", "useEffect"]},
      {"file": "api/checkout.js", "exports": ["applyDiscount", "validateCode"]}
    ],
    "provides": ["CartProvider", "useCart", "getTotalPrice"]
  }
}
```

### 🔍 `get_optimal_context` - **File Selection Tool**
Get the most relevant files for any coding task with grep commands.

**What it does:** Analyzes your task and returns the best files to include in context, plus grep commands to search for specific patterns.

**Key parameters:**
- `task` (required): Describe what you're trying to do ("fix login bug", "add new feature")
- `currentFile`: The file you're currently working on
- `targetTokens`: How many tokens you want to use (default: 6000)
- `progressiveLevel`: 1=immediate context, 2=expanded, 3=comprehensive

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

// Generate complete context package (v2.0.0 - AI Context Engineer)
Use generate_context_package with query="getTotalPrice returns NaN in cart"
Use generate_context_package to understand "how does the authentication system work"
Use generate_context_package for "add email notification when order ships"

// Get relevant files with grep commands
Use get_optimal_context to find files related to "fixing the user authentication flow"

// Search for specific concepts
Use search_codebase to find files containing "websocket connection handling"

// Configure for large projects
Use set_project_scope to only include src/** and exclude test files
```

## How It Works

### Version 2.0.0 - AI Context Engineer
Smart Context has evolved from a file selector to a comprehensive **AI Context Engineer** that:

1. **Understands Your Query**: Uses NLP to extract intent, concepts, entities, and error patterns
2. **Extracts Real Code**: Finds and extracts actual functions and code sections, not just file paths
3. **Maps Relationships**: Analyzes imports, exports, and dependencies between files
4. **Suggests Fixes**: Recognizes common error patterns (NaN, null, undefined) and suggests solutions
5. **Enforces Token Budgets**: Intelligently allocates tokens across different context sections
6. **Learns From Usage**: Tracks which files and code sections actually helped solve problems

### Core Process
1. **Query Analysis**: Deep semantic understanding of your task
2. **Multi-Factor Scoring**: Files scored on semantic similarity, git history, imports, and learned patterns
3. **Code Extraction**: Pulls specific functions and relevant code sections
4. **Relationship Mapping**: Builds dependency graph of your codebase
5. **Context Generation**: Creates structured package optimized for AI consumption

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

### Available Test Files

- `test-final-validation.js` - Main validation suite
- `test-scanner.js` - File scanning functionality
- `test-performance.js` - Performance benchmarks
- `test-error-handling.js` - Error handling tests
- `test-cross-platform.js` - Cross-platform compatibility
- `test-mcp-server.js` - MCP server functionality
- `run-all-tests.js` - Test runner for all suites
- Various scenario tests for query styles, edge cases, and real-world usage

## 📊 Performance

Performance characteristics:
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

See [TEST_RESULTS_COMPREHENSIVE.md](./TEST_RESULTS_COMPREHENSIVE.md) for technical details.

## 📚 Documentation

- [Installation Guide](./INSTALLATION.md) - Platform-specific setup instructions
- [Quick Start Guide](./QUICK_START.md) - Get running in 5 minutes
- [Setup Visual Guide](./SETUP_VISUAL_GUIDE.md) - Step-by-step with screenshots
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Claude Code Setup](./CLAUDE_CODE_SETUP.md) - Setup for Claude Code CLI
- [Docker Setup](./DOCKER_SETUP.md) - Docker deployment guide
- [Test Results](./TEST_RESULTS_COMPREHENSIVE.md) - Comprehensive test analysis
- [Feedback Analysis](./FEEDBACK_ANALYSIS.md) - User feedback and improvements
- [Improvements v1.0.1](./IMPROVEMENTS_v1.0.1.md) - Latest version improvements
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

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