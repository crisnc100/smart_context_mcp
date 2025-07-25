# Smart Context MCP Server - Troubleshooting Guide

This guide covers common issues, limitations, and solutions for the Smart Context MCP Server.

## Table of Contents
- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Known Limitations](#known-limitations)
- [Platform-Specific Issues](#platform-specific-issues)

## Installation Issues

### "Cannot find module '@modelcontextprotocol/sdk'"
**Problem**: Dependencies not installed properly.

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### "node-gyp rebuild failed"
**Problem**: Native modules compilation failure.

**Solution**: Smart Context uses pure JavaScript dependencies and shouldn't have this issue. If you see it, you may have modified package.json.

### "EACCES: permission denied"
**Problem**: Global npm install permission issues.

**Solution**:
```bash
# Option 1: Use npx instead of global install
npx @crisnc100/smart-context-mcp

# Option 2: Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

## Configuration Problems

### "No files found" / Empty Results
**Most Common Issue** - PROJECT_ROOT is not configured correctly.

**Diagnosis**:
1. Run in Claude: `Use the setup_wizard tool with action="check"`
2. Check the "currentPath" in the response

**Solutions**:
- Ensure PROJECT_ROOT points to your actual project, NOT the Smart Context directory
- Use absolute paths, not relative paths
- On Windows, use double backslashes `\\` or forward slashes `/`

**Example Fix**:
```json
// ❌ Wrong - Points to Smart Context
"PROJECT_ROOT": "C:\\Users\\you\\smart_context_mcp"

// ✅ Correct - Points to your project
"PROJECT_ROOT": "C:\\Users\\you\\my-actual-project"
```

### "Configuration file not found"
**Problem**: Claude Desktop config file doesn't exist.

**Solution**: Create the file manually:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Initial content**:
```json
{
  "mcpServers": {}
}
```

### Server Doesn't Appear in Claude
**Problem**: Configuration not loaded.

**Solutions**:
1. **Fully restart Claude Desktop** (not just reload)
2. Check JSON syntax - missing commas are common
3. Verify the command path exists
4. Check Claude Desktop logs for errors

## Runtime Errors

### "config is not defined"
**Problem**: Missing import (fixed in v1.0).

**Solution**: Update to latest version or add to src/index.js:
```javascript
import config from './config.js';
```

### "Cannot read properties of null (reading 'split')"
**Problem**: currentFile parameter is null (fixed in v1.0).

**Solution**: Update to latest version. The tool now handles optional currentFile properly.

### "undefined is not valid JSON"
**Problem**: Session data parsing error (fixed in v1.0).

**Solution**: Update to latest version. The tool now validates data before parsing.

### "ENOENT: no such file or directory"
**Problem**: Trying to read a file that doesn't exist.

**Solutions**:
- Verify PROJECT_ROOT is correct
- Check file permissions
- Ensure the project directory is accessible

### "JavaScript heap out of memory"
**Problem**: Scanning very large projects.

**Solutions**:
1. Use project scopes to limit scanning:
   ```
   Use set_project_scope to include only "src/**" and exclude "node_modules/**"
   ```
2. Increase Node.js memory:
   ```json
   "env": {
     "NODE_OPTIONS": "--max-old-space-size=4096"
   }
   ```

## Performance Issues

### Slow Initial Scan
**Problem**: Large codebases take time to scan.

**Solutions**:
1. **Use Project Scopes**:
   ```
   set_project_scope({
     includePaths: ["src/**", "lib/**"],
     excludePaths: ["**/test/**", "**/dist/**"],
     maxDepth: 5
   })
   ```

2. **Adjust File Size Limits**:
   ```json
   "env": {
     "SMART_CONTEXT_MAX_FILE_SIZE": "524288"  // 512KB
   }
   ```

### High Memory Usage
**Problem**: Keeping too many files in memory.

**Solutions**:
- Reduce token budget: `targetTokens: 4000`
- Increase minimum relevance: `minRelevanceScore: 0.5`
- Use progressive loading: `progressiveLevel: 1`

## Known Limitations

### 1. **Single Project per Server Instance**
Each MCP server instance can only handle one PROJECT_ROOT at a time. For multiple projects, configure multiple server entries:
```json
{
  "mcpServers": {
    "smart-context-project1": { ... },
    "smart-context-project2": { ... }
  }
}
```

### 2. **No Real-time File Watching**
The server scans files on each request. It doesn't watch for file changes in real-time.

### 3. **Git History Limitations**
- Only analyzes the currently checked out branch
- Requires git to be installed and accessible
- May be slow on repositories with very long histories

### 4. **Token Counting Approximation**
Token counts are estimates. Actual usage may vary by ±10% depending on the LLM model.

### 5. **Learning Data is Local**
Learning data is stored locally and doesn't sync between machines.

### 6. **File Type Limitations**
- Binary files are skipped
- Very large files (>1MB by default) are skipped
- Some file types may not parse correctly

### 7. **No Cross-Repository Analysis**
Cannot analyze relationships between files in different repositories.

## Platform-Specific Issues

### Windows

#### Path Format Issues
**Problem**: Incorrect path separators.

**Solution**: Use either:
- Double backslashes: `C:\\Users\\name\\project`
- Forward slashes: `C:/Users/name/project`

#### Long Path Issues
**Problem**: Windows path length limitations.

**Solution**: Enable long path support in Windows 10+:
```powershell
# Run as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### macOS

#### "operation not permitted"
**Problem**: macOS security restrictions.

**Solution**: Grant terminal/Claude Desktop full disk access in System Preferences > Security & Privacy.

#### Case Sensitivity
**Problem**: macOS is case-insensitive by default.

**Solution**: Be consistent with file path casing in configuration.

### Linux/WSL

#### Permission Denied
**Problem**: File permission issues.

**Solution**:
```bash
# Fix permissions
chmod -R 755 /path/to/project
```

#### WSL Path Translation
**Problem**: Windows paths in WSL.

**Solution**: Use WSL paths:
```bash
# Convert Windows path to WSL
/mnt/c/Users/name/project  # Instead of C:\Users\name\project
```

## Getting Help

### Debug Information
When reporting issues, include:
1. Output of `setup_wizard` with `action="check"`
2. Your Claude Desktop configuration (without sensitive data)
3. Error messages from Claude Desktop logs
4. Your platform (Windows/macOS/Linux)
5. Node.js version: `node --version`

### Quick Diagnostics
Run these in Claude to diagnose issues:
```
1. Use setup_wizard with action="check"
2. Use search_codebase with query="test" and see if any files are found
3. Use get_learning_insights to check if the database is working
```

### Community Support
- GitHub Issues: https://github.com/crisnc100/smart-context-mcp/issues
- Check existing issues before creating new ones
- Include diagnostic information in issue reports

## Prevention Tips

1. **Always run setup_wizard first** when configuring a new project
2. **Use absolute paths** for PROJECT_ROOT
3. **Test with a small project first** before using on large codebases
4. **Keep the tool updated** to get bug fixes
5. **Configure project scopes** for large projects to improve performance

---

Remember: Most issues are related to PROJECT_ROOT configuration. When in doubt, run `setup_wizard` to check your setup!