# Smart Context MCP Server - Installation Guide

## 🚀 Quick Install

### Method 1: NPM Package (Recommended)

```bash
npm install -g @smart-context/mcp-server
```

### Method 2: Direct from GitHub

```bash
git clone https://github.com/crisnc100/smart-context-mcp.git
cd smart-context-mcp
npm install
```

## 📋 Configuration for Claude Desktop

### Windows Configuration

1. Open Claude Desktop settings file:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add to the `mcpServers` section:

   **For NPM installation (choose one):**
   
   Option A - Using npx (recommended):
   ```json
   {
     "mcpServers": {
       "smart-context": {
         "command": "npx",
         "args": ["@smart-context/mcp-server"],
         "env": {
           "PROJECT_ROOT": "C:\\Users\\YourName\\YourProject"
         }
       }
     }
   }
   ```
   
   Option B - After global install:
   ```json
   {
     "mcpServers": {
       "smart-context": {
         "command": "smart-context",
         "args": [],
         "env": {
           "PROJECT_ROOT": "C:\\Users\\YourName\\YourProject"
         }
       }
     }
   }
   ```

   **For local installation:**
   ```json
   {
     "mcpServers": {
       "smart-context": {
         "command": "node",
         "args": ["C:\\path\\to\\smart_context_mcp\\src\\index.js"],
         "env": {
           "PROJECT_ROOT": "C:\\Users\\YourName\\YourProject"
         }
       }
     }
   }
   ```

### macOS Configuration

1. Open Claude Desktop settings file:
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. Add to the `mcpServers` section:

   **For NPM installation:**
   ```json
   {
     "mcpServers": {
       "smart-context": {
         "command": "npx",
         "args": ["@smart-context/mcp-server"],
         "env": {
           "PROJECT_ROOT": "/Users/YourName/YourProject"
         }
       }
     }
   }
   ```

### Linux Configuration

1. Open Claude Desktop settings file:
   ```
   ~/.config/Claude/claude_desktop_config.json
   ```

2. Add to the `mcpServers` section:

   **For NPM installation:**
   ```json
   {
     "mcpServers": {
       "smart-context": {
         "command": "npx",
         "args": ["@smart-context/mcp-server"],
         "env": {
           "PROJECT_ROOT": "/home/YourName/YourProject"
         }
       }
     }
   }
   ```

## 🔧 Multiple Projects Setup

You can configure multiple projects by adding different server entries:

```json
{
  "mcpServers": {
    "smart-context-project1": {
      "command": "npx",
      "args": ["@smart-context/mcp-server"],
      "env": {
        "PROJECT_ROOT": "C:\\Projects\\Project1"
      }
    },
    "smart-context-project2": {
      "command": "npx",
      "args": ["@smart-context/mcp-server"],
      "env": {
        "PROJECT_ROOT": "C:\\Projects\\Project2"
      }
    }
  }
}
```

## ⚠️ Important Notes

1. **Path Format**: 
   - Windows: Use double backslashes `\\` or forward slashes `/`
   - macOS/Linux: Use forward slashes `/`

2. **PROJECT_ROOT**: This MUST point to your actual project directory, not the Smart Context installation directory

3. **Restart Required**: After editing the config, completely restart Claude Desktop (not just reload)

## 🧪 Testing Your Installation

1. Open Claude Desktop
2. Start a new conversation
3. Type: "Use the setup_wizard tool to check my Smart Context configuration"
4. If configured correctly, you should see your project details

## 🔍 Troubleshooting

### "No files found" Error
- Verify PROJECT_ROOT points to a directory with code files
- Check that the directory exists and contains supported file types

### "Command not found" Error
- For NPM install: Ensure npm/npx is in your system PATH
- Try using the full path to npx in the command field

### Server Doesn't Appear
- Check JSON syntax in your config file
- Ensure you've restarted Claude Desktop completely
- Look for errors in Claude Desktop logs

## 📁 Supported File Types

Smart Context automatically scans:
- JavaScript/TypeScript: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`
- Python: `.py`
- Java: `.java`
- C/C++: `.c`, `.cpp`, `.h`, `.hpp`
- Go: `.go`
- Rust: `.rs`
- And many more...

## 🛠️ Advanced Configuration

You can customize behavior with additional environment variables:

```json
{
  "env": {
    "PROJECT_ROOT": "/your/project",
    "SMART_CONTEXT_TOKEN_BUDGET": "8000",
    "SMART_CONTEXT_MIN_RELEVANCE": "0.3"
  }
}
```

For more details, see the [configuration guide](./CONFIG.md).