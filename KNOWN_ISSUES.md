# Smart Context MCP Server - Known Issues & Limitations

## Current Limitations (v1.0.0)

### 1. Platform Support
- **Issue**: Limited testing on macOS and Linux
- **Impact**: May have path handling issues on non-Windows systems
- **Workaround**: Use absolute paths and test thoroughly
- **Fix planned**: v1.1.0 with cross-platform CI/CD

### 2. Symbolic Links
- **Issue**: Symbolic links not followed or detected
- **Impact**: Linked files/directories ignored
- **Workaround**: Copy files instead of linking
- **Fix planned**: v1.1.0 with configurable symlink handling

### 3. Single-threaded Performance
- **Issue**: File scanning uses single CPU core
- **Impact**: Slower scanning for large projects (>10K files)
- **Workaround**: Use ignore patterns and file size limits
- **Fix planned**: v1.1.0 with Worker threads

### 4. Memory Scaling
- **Issue**: Keeps all file metadata in memory
- **Impact**: High memory usage for huge projects (>50K files)
- **Workaround**: Increase Node.js heap size: `node --max-old-space-size=4096`
- **Fix planned**: v1.2.0 with streaming architecture

### 5. Windows Long Paths
- **Issue**: Paths over 260 characters may fail on Windows
- **Impact**: Deep directory structures inaccessible
- **Workaround**: Enable long paths in Windows or use shorter paths
- **Fix planned**: v1.1.0 with long path support

### 6. Case Sensitivity
- **Issue**: File matching is case-sensitive
- **Impact**: May miss files on case-insensitive systems
- **Workaround**: Use consistent casing in project
- **Fix planned**: v1.1.0 with configurable case handling

### 7. Submodule Support
- **Issue**: Git submodules not analyzed
- **Impact**: Missing context from submodules
- **Workaround**: Include submodules in main repo
- **Fix planned**: v1.2.0 with full submodule support

### 8. Console-only Logging
- **Issue**: All logs go to console, no log files
- **Impact**: Difficult to debug issues in production
- **Workaround**: Redirect stdout/stderr to files
- **Fix planned**: v1.1.0 with structured logging

### 9. No Incremental Updates
- **Issue**: Full project scan on every start
- **Impact**: Slow startup for large projects
- **Workaround**: Use caching (enabled by default)
- **Fix planned**: v1.2.0 with file watching

### 10. Database Concurrency
- **Issue**: sql.js doesn't support concurrent access
- **Impact**: Can't run multiple instances
- **Workaround**: Use different PROJECT_ROOT for each instance
- **Fix planned**: v2.0.0 with better-sqlite3 option

## Edge Cases

### Git-related
- **Detached HEAD**: Falls back to no git analysis
- **Shallow clones**: Limited history analysis
- **Binary files in git**: Properly skipped
- **Very old commits**: Limited by config

### File System
- **Circular symlinks**: Would cause infinite loop (not supported)
- **Network drives**: May have performance issues
- **Encrypted files**: Will fail to read (skipped)
- **Files being written**: May get partial content

### Unicode & Encoding
- **Non-UTF8 files**: May have parsing issues
- **Unicode filenames**: Supported but not extensively tested
- **Mixed line endings**: Handled correctly
- **BOM markers**: Stripped during parsing

## Workarounds

### For Large Projects
```json
{
  "fileScanning": {
    "maxFileSize": 262144,    // 256KB
    "ignorePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.min.js",
      "**/coverage/**"
    ]
  },
  "git": {
    "defaultCommitLimit": 20  // Reduce git analysis
  }
}
```

### For Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 src/index.js

# Or set in environment
export NODE_OPTIONS="--max-old-space-size=4096"
```

### For Performance
```javascript
// Use progressive loading
const result = await mcp.callTool({
  name: 'get_optimal_context',
  arguments: {
    progressiveLevel: 1,  // Start small
    targetTokens: 2000    // Lower token budget
  }
});
```

## Reporting Issues

Please report issues at: https://github.com/crisnc100/smart-context-mcp/issues

Include:
1. Operating system and version
2. Node.js version
3. Project size (files and total size)
4. Error messages or unexpected behavior
5. Configuration used

## Future Improvements

See [COMPREHENSIVE_TEST_REPORT.md](./COMPREHENSIVE_TEST_REPORT.md#recommendations-for-v110) for planned fixes and enhancements.