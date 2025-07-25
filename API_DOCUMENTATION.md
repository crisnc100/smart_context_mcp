# Smart Context MCP Server - API Documentation

## Overview

The Smart Context MCP Server provides intelligent file context selection for LLMs during coding tasks. It uses semantic understanding, git history analysis, and machine learning to select the most relevant files for any given task.

## Installation

```bash
npm install @crisnc100/smart-context-mcp
```

## Configuration

### Environment Variables

- `PROJECT_ROOT` - Root directory of the project to analyze (required)
- `SMART_CONTEXT_TOKEN_BUDGET` - Override default token budget (default: 6000)
- `SMART_CONTEXT_CONFIG` - Path to custom configuration file

### Configuration File

Create a `.smart-context-config.json` in your project root:

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
    "maxFileSize": 1048576,
    "ignorePatterns": ["node_modules/**", "*.log"]
  },
  "git": {
    "recentChangesHours": 48,
    "defaultCommitLimit": 100
  }
}
```

## MCP Tools

### get_optimal_context

Retrieves the most relevant files for a coding task using multi-factor analysis.

**Parameters:**
```typescript
{
  task: string;              // Description of the coding task
  currentFile: string;       // Path to the file being edited
  targetTokens?: number;     // Token budget (default: 6000)
  conversationId?: string;   // ID for conversation tracking
  progressiveLevel?: number; // 1=immediate, 2=expanded, 3=comprehensive
}
```

**Response:**
```typescript
{
  sessionId: string;
  taskMode: 'debug' | 'feature' | 'refactor' | 'general';
  included: Array<{
    path: string;
    relevance: number;     // 0-1 score
    reason: string;        // Explanation for inclusion
    tokens: number;        // Token count
    confidence: number;    // 0-1 confidence score
  }>;
  excluded: Array<{
    path: string;
    score: number;
    reasons: string[];
  }>;
  totalTokens: number;
  tokenBudget: number;
  suggestions: string[];
}
```

**Example:**
```javascript
const result = await mcp.callTool({
  name: 'get_optimal_context',
  arguments: {
    task: 'fix authentication error when session expires',
    currentFile: 'src/api/authController.js',
    targetTokens: 4000,
    conversationId: 'conv-123'
  }
});
```

### record_session_outcome

Records which files were actually helpful for learning and improvement.

**Parameters:**
```typescript
{
  sessionId: string;           // From get_optimal_context response
  wasSuccessful: boolean;      // Whether the task was completed
  filesActuallyUsed?: string[]; // Paths of files that were helpful
}
```

**Response:**
```typescript
{
  message: string;
  updated: boolean;
}
```

**Example:**
```javascript
await mcp.callTool({
  name: 'record_session_outcome',
  arguments: {
    sessionId: result.sessionId,
    wasSuccessful: true,
    filesActuallyUsed: [
      'src/auth/authService.js',
      'src/middleware/authMiddleware.js'
    ]
  }
});
```

### search_codebase

Performs semantic search across the codebase.

**Parameters:**
```typescript
{
  query: string;      // Natural language search query
  limit?: number;     // Max results (default: 10)
}
```

**Response:**
```typescript
{
  results: Array<{
    path: string;
    score: number;      // Relevance score 0-1
    matches: string[];  // Matching content snippets
    type: string;       // File type
  }>;
  totalFound: number;
}
```

### get_file_relationships

Finds files related to a specific file through various relationships.

**Parameters:**
```typescript
{
  filePath: string;
  relationshipType?: 'import' | 'git-co-change' | 'all';
}
```

**Response:**
```typescript
{
  relationships: Array<{
    file: string;
    type: string;
    strength: number;    // 0-1 relationship strength
    reason: string;
  }>;
}
```

### analyze_git_patterns

Analyzes git history to find file co-change patterns.

**Parameters:**
```typescript
{
  commitLimit?: number;  // Number of commits to analyze (default: 100)
}
```

**Response:**
```typescript
{
  patterns: Array<{
    files: [string, string];
    coChangeCount: number;
    strength: number;
  }>;
  totalCommitsAnalyzed: number;
}
```

### get_learning_insights

Retrieves insights about learned patterns and file usage.

**Parameters:**
```typescript
{
  taskMode?: 'debug' | 'feature' | 'refactor';
}
```

**Response:**
```typescript
{
  totalSessions: number;
  successRate: number;
  topFiles: Array<{
    path: string;
    helpfulCount: number;
    avgRelevanceScore: number;
  }>;
  patterns: Array<{
    pattern: string;
    occurrences: number;
  }>;
}
```

## Task Modes

The system automatically detects and adapts to different task modes:

### Debug Mode
- Prioritizes: Recently changed files, error handlers, test files, log statements
- Keywords: error, bug, fix, issue, fail, crash, exception
- Use case: Fixing bugs, investigating errors

### Feature Mode
- Prioritizes: Interfaces, similar features, type definitions, models
- Keywords: add, implement, create, new, feature, functionality
- Use case: Adding new functionality

### Refactor Mode
- Prioritizes: All usages, dependencies, related tests
- Keywords: refactor, rename, move, reorganize, clean
- Use case: Code restructuring and improvements

## CLI Usage

```bash
# Start the MCP server
smart-context start --project-root /path/to/project

# Initialize configuration
smart-context init

# Analyze project structure
smart-context analyze

# Test context selection
smart-context test
```

## Integration Examples

### With Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "smart-context": {
      "command": "node",
      "args": ["/path/to/smart-context/src/index.js"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

### Programmatic Usage

```javascript
import { ContextAnalyzer } from '@crisnc100/smart-context-mcp';

const analyzer = new ContextAnalyzer('/path/to/project');

const context = await analyzer.getOptimalContext({
  task: 'implement user authentication',
  currentFile: 'src/routes/auth.js',
  targetTokens: 6000
});

console.log(`Selected ${context.included.length} files`);
```

## Performance Considerations

- **File Size Limits**: Files over 1MB are skipped by default
- **Parallel Processing**: File scanning uses parallel processing
- **Caching**: File metadata is cached for performance
- **Git Analysis**: Limited to recent commits for performance

## Error Handling

The server gracefully handles:
- Non-git repositories (git features disabled)
- Large files (skipped with notification)
- Malformed code files (partial analysis)
- Missing permissions (file skipped)
- Unicode and special characters

## Best Practices

1. **Regular Feedback**: Use `record_session_outcome` to improve accuracy
2. **Progressive Loading**: Start with level 1, expand as needed
3. **Task Descriptions**: Be specific about what you're trying to accomplish
4. **Token Budgets**: Adjust based on your model's context window

## Troubleshooting

### Common Issues

**Files not being selected:**
- Check file size limits in configuration
- Verify file extensions aren't ignored
- Ensure git repository is accessible

**High memory usage:**
- Reduce batch size in file scanner
- Lower git commit analysis limit
- Enable file size limits

**Slow performance:**
- Enable caching in configuration
- Reduce file scan scope with ignore patterns
- Use progressive loading levels

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## License

MIT License - see [LICENSE](./LICENSE) for details.