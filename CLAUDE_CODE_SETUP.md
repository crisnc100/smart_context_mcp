# Claude Code CLI Setup Guide

Smart Context MCP works perfectly with Claude Code CLI! Here's how to set it up for your projects.

## Installation (Per Project)

Claude Code CLI reads MCP configuration from `.mcp.json` in your project root. For best results, install Smart Context locally in each project:

```bash
cd /path/to/your-project
npm install @crisnc100/smart-context-mcp
```

## Configuration

Create `.mcp.json` in your project root:

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

That's it! The `"."` automatically points to your current project directory.

## Testing

In Claude Code CLI, test with:
```
Use the setup_wizard tool to check my configuration
```

## Why Local Install?

- **No path issues**: Relative paths always work
- **Per-project isolation**: Each project has its own instance
- **Version control**: Lock specific versions per project
- **No global conflicts**: Works consistently across environments

## Quick Setup Script

Save this as `setup-smart-context.sh` (Linux/Mac) or `setup-smart-context.ps1` (Windows):

### PowerShell (Windows):
```powershell
# setup-smart-context.ps1
npm install @crisnc100/smart-context-mcp
@'
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
'@ | Out-File -FilePath .mcp.json -Encoding UTF8
Write-Host "✅ Smart Context MCP configured for this project!"
```

### Bash (Linux/Mac):
```bash
#!/bin/bash
npm install @crisnc100/smart-context-mcp
cat > .mcp.json << 'EOF'
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
EOF
echo "✅ Smart Context MCP configured for this project!"
```

## Comparison: Claude Desktop vs Claude Code

| Feature | Claude Desktop | Claude Code CLI |
|---------|---------------|-----------------|
| Config Location | `%APPDATA%\Claude\claude_desktop_config.json` | `.mcp.json` in project root |
| Install Method | Global (`npm install -g`) | Local (`npm install`) |
| Path Type | Absolute paths | Relative paths |
| PROJECT_ROOT | Full path to project | Just `"."` |
| Per Project | Configure in global file | Install in each project |

## Troubleshooting

### "Command not found"
- Make sure you ran `npm install` in the project directory
- Check that `node_modules/@crisnc100/smart-context-mcp` exists

### "Failed to parse"
- Ensure `.mcp.json` has valid JSON syntax
- `args` must be an array `["..."]`

### WSL/Windows Path Issues
- Use forward slashes `/` or double backslashes `\\`
- The local install approach avoids most path issues

## Benefits of This Approach

1. **Simple**: Same config works everywhere
2. **Portable**: Check `.mcp.json` into git
3. **Reliable**: No global path confusion
4. **Flexible**: Different versions per project

Now your team can clone the repo and just run `npm install` to get Smart Context working!