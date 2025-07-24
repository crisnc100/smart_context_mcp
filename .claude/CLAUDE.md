# Claude Code Rules and Initial Prompt for Smart Context MCP Server

## Claude Code Rules File (.claude/CLAUDE.md)

```markdown
# Smart Context Pruning MCP Server - Development Rules

## Project Overview
Building an MCP (Model Context Protocol) server that intelligently selects relevant files for LLM context based on:
- Semantic understanding of queries
- Task-specific strategies (debug/feature/refactor)
- Learning from usage patterns
- Git history analysis
- Progressive context loading

## Core Development Principles

1. **Semantic First**
   - Always prioritize understanding intent over keyword matching
   - Use NLP techniques to extract concepts, not just string matches
   - Distinguish between "fix auth", "implement auth", and "test auth"

2. **Transparency is Key**
   - Every file selection must include clear reasoning
   - Show confidence scores (0-100%) for all decisions
   - Explain why files were excluded, not just included

3. **Learning Must Be Real**
   - Track which files were actually helpful, not just included
   - Use exponential moving average for score updates (α = 0.1)
   - Build confidence through repeated successful usage

4. **Performance Matters**
   - Use SQLite with WAL mode for concurrent access
   - Cache file embeddings and token counts
   - Stream large files instead of loading entirely

5. **Progressive Enhancement**
   - Start with MVP features that work
   - Add advanced features incrementally
   - Always maintain backward compatibility

## File Structure Rules

1. **Module Organization**
   ```
   src/
   ├── core/           # Essential MCP functionality
   ├── analysis/       # Context analysis logic
   ├── learning/       # ML and scoring
   ├── tracking/       # Conversation/session tracking
   └── utils/          # Shared utilities
   ```

2. **Database Design**
   - Use foreign keys and indexes appropriately
   - Normalize data but prioritize query performance
   - Always include timestamp fields for learning

3. **Error Handling**
   - Gracefully handle missing files
   - Provide fallbacks for all external dependencies
   - Log errors but don't crash the server

## Implementation Guidelines

1. **MCP Protocol**
   - Follow MCP SDK patterns exactly
   - Use proper schema validation
   - Return structured JSON responses

2. **Testing Strategy**
   - Unit test each analyzer component
   - Integration test the full context flow
   - Create fixtures for different project types

3. **Git Integration**
   - Handle repos without git gracefully
   - Cache git analysis results
   - Run git operations asynchronously

4. **Token Management**
   - Always respect token budgets
   - Provide accurate token counts
   - Offer progressive loading options

## Code Quality Standards

1. **Type Safety**
   - Use TypeScript or comprehensive JSDoc
   - Validate all inputs
   - Define clear interfaces

2. **Async Patterns**
   - Use async/await consistently
   - Handle promise rejections
   - Avoid blocking operations

3. **Memory Management**
   - Limit in-memory caches
   - Use streaming for large files
   - Clean up old conversation data

## Feature Priority Order

1. **Phase 1 (MVP)**
   - Basic semantic search
   - Import/export analysis
   - Simple relevance scoring
   - Session tracking

2. **Phase 2**
   - Git co-change analysis
   - Task mode detection
   - Conversation awareness
   - Confidence scoring

3. **Phase 3**
   - Advanced NLP features
   - Multi-repo support
   - Team learning aggregation
   - IDE integrations

## Testing Scenarios

Always test with:
1. Small project (< 100 files)
2. Large project (> 1000 files)
3. Multiple languages (JS, Python, Go)
4. Different task types (debug, feature, refactor)
5. Progressive context expansion

## Performance Benchmarks

Target metrics:
- Initial context selection: < 500ms
- File scanning: < 2s for 1000 files
- Learning update: < 100ms
- Memory usage: < 200MB for large projects
```

## Initial Prompt for Claude Code

```markdown
I want to build a Smart Context Pruning MCP Server that helps LLMs like you select the most relevant files for any coding task. This server will learn from usage patterns and provide intelligent, transparent context selection.

Please read the Enhanced Smart Context Pruning MCP Server MVP document that I'll provide. This document contains:

1. Complete implementation details with code
2. LLM feedback that shaped the design
3. Database schemas and module structure
4. Enhanced features based on real LLM needs

Key goals:
- Semantic understanding of queries (not just keywords)
- Task-specific strategies (debugging vs feature development)
- Full transparency with confidence scores and reasoning
- Learning from actual usage, not just inclusion
- Progressive context loading
- Git integration for co-change patterns

After reading the MVP, let's start by:
1. Setting up the project structure
2. Implementing the core database schema
3. Building the semantic search module
4. Creating the basic MCP server

The MVP includes all the code, but we'll build it step-by-step, testing each component as we go.

Important: This server should genuinely help you and other LLMs work more effectively with large codebases by providing exactly the right context at the right time.
```

## Quick Start Commands for Implementation

```bash
# Initialize project
mkdir smart-context-pruning && cd smart-context-pruning
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk sqlite3 better-sqlite3 tiktoken fs-extra glob ignore simple-git natural stopword

# Create project structure
mkdir -p src/{core,analysis,learning,tracking,utils} data config test

# Create initial files based on MVP
touch src/index.js src/database.js src/contextAnalyzer.js src/semanticSearch.js

# Set up git
git init
echo "node_modules/\ndata/\n*.log\n.env*" > .gitignore

# Create initial config
echo '{"contextPruning": {"defaultTokenBudget": 6000}}' > config/default.json
```

## Development Workflow

1. **Start with Database**
   ```javascript
   // First, get the database schema working
   // Test with simple queries before adding complexity
   ```

2. **Build Semantic Search**
   ```javascript
   // Implement basic NLP features
   // Test with various query types
   ```

3. **Add Core Analysis**
   ```javascript
   // Start with simple relevance scoring
   // Add features incrementally
   ```

4. **Implement MCP Server**
   ```javascript
   // Begin with basic tool: get_optimal_context
   // Add other tools as modules are ready
   ```

5. **Test End-to-End**
   ```javascript
   // Use test client to verify functionality
   // Test with real project scenarios
   ```

## Example Test Cases

```javascript
// Test 1: Debug query
{
  task: "fix authentication error when user session expires",
  currentFile: "src/auth/session.js",
  expectedFiles: ["jwt.js", "middleware/auth.js", "session.test.js"]
}

// Test 2: Feature query
{
  task: "add social media sharing to blog posts",
  currentFile: "src/blog/post.js",
  expectedFiles: ["components/ShareButton.js", "services/social.js", "types/post.ts"]
}

// Test 3: Refactor query
{
  task: "refactor user service to use new API client",
  currentFile: "src/services/user.js",
  expectedFiles: ["api/client.js", "tests/user.test.js", "components/UserProfile.js"]
}
```

## Success Criteria

The MCP server is successful when:
1. ✅ Provides relevant files 85%+ of the time
2. ✅ Explains every decision clearly
3. ✅ Learns and improves with usage
4. ✅ Respects token budgets
5. ✅ Handles large codebases efficiently
6. ✅ Works seamlessly with Claude Code and Claude Desktop

## Debugging Tips

Common issues and solutions:
1. **Slow file scanning** → Implement caching and incremental updates
2. **Poor relevance** → Check semantic analysis and scoring weights
3. **Token overflow** → Verify token counting and progressive loading
4. **Learning not working** → Ensure session outcomes are recorded properly
5. **Git errors** → Add proper error handling and fallbacks
```