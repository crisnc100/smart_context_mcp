# Smart Context MCP Server - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install
```bash
npm install @crisnc100/smart-context-mcp
```

### 2. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
```json
{
  "mcpServers": {
    "smart-context": {
      "command": "node",
      "args": ["C:\\path\\to\\node_modules\\@smart-context\\mcp-server\\src\\index.js"],
      "env": {
        "PROJECT_ROOT": "C:\\path\\to\\your\\project"
      }
    }
  }
}
```

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "smart-context": {
      "command": "node",
      "args": ["/path/to/node_modules/@crisnc100/smart-context-mcp/src/index.js"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

### 4. Start Using!

In Claude, you'll now see these tools:

- 🎯 **get_optimal_context** - "Find the most relevant files for my task"
- 📝 **record_session_outcome** - "These files were helpful"
- 🔍 **search_codebase** - "Search for files containing X"

## 💡 Example Workflows

### Debugging an Error
```
You: "Help me fix the authentication error when sessions expire"
Claude: *Uses get_optimal_context to find auth-related files*
You: "Perfect, the issue was in authService.js"
Claude: *Uses record_session_outcome to learn for next time*
```

### Adding a Feature
```
You: "I need to add email notifications when users sign up"
Claude: *Finds similar notification code and email templates*
You: "Show me how other notifications are implemented"
Claude: *Uses search_codebase to find notification patterns*
```

## 🎮 CLI Usage

```bash
# Install globally
npm install -g @crisnc100/smart-context-mcp

# Analyze your project
smart-context analyze --project-root .

# Test context selection
smart-context test --project-root .

# Start server manually
smart-context start --project-root .
```

## ⚡ Performance Tips

1. **For large projects (1000+ files)**:
   ```json
   {
     "fileScanning": {
       "maxFileSize": 524288,  // 512KB limit
       "ignorePatterns": ["dist/**", "build/**", "*.min.js"]
     }
   }
   ```

2. **For better debugging context**:
   ```json
   {
     "git": {
       "recentChangesHours": 24,  // Focus on recent changes
       "defaultCommitLimit": 50   // Analyze fewer commits
     }
   }
   ```

3. **Use progressive loading**:
   - Start with level 1 (immediate context)
   - Expand to level 2 if needed
   - Use level 3 for comprehensive analysis

## 🔧 Troubleshooting

### "Files not found"
- Check PROJECT_ROOT path is absolute
- Verify .gitignore isn't excluding files
- Run `smart-context analyze` to see what's scanned

### "High memory usage"
- Reduce maxFileSize in config
- Add more ignorePatterns
- Use progressive loading

### "Slow performance"
- Enable caching (default)
- Reduce git commit analysis limit
- Skip large generated files

## 📚 Next Steps

- Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for all features
- Check [TEST_REPORT.md](./TEST_REPORT.md) for capabilities
- Join discussions at [GitHub Issues](https://github.com/crisnc100/smart-context-mcp/issues)

## 🎯 Pro Tips

1. **Be specific** in task descriptions for better results
2. **Give feedback** using record_session_outcome to improve accuracy
3. **Start small** with progressive loading to save tokens
4. **Trust the learning** - it gets better with use!

Ready to code smarter? The Smart Context MCP Server learns your codebase so Claude doesn't have to! 🚀