# 🚀 Smart Context Setup - Visual Guide

## ⚡ Quick Setup in 3 Steps

### Step 1: Check Your Current Setup

When you first use Smart Context, run this command in Claude:

```
Use the setup_wizard tool to check my configuration
```

You'll see one of these responses:

#### ❌ Not Configured (Most Common)
```json
{
  "status": "not_configured",
  "message": "⚠️ PROJECT_ROOT not configured! Smart Context doesn't know where your project is.",
  "currentPath": "C:\\Users\\claude\\AppData\\Local\\AnthropicClaude\\app-0.12.28",
  "nextSteps": [
    "1. Use setup_wizard with action=\"configure\" to set up your project",
    "2. Or manually set PROJECT_ROOT in Claude Desktop config"
  ]
}
```

#### ✅ Already Configured
```json
{
  "status": "configured", 
  "message": "✅ PROJECT_ROOT is configured",
  "currentPath": "C:\\Users\\you\\my-project",
  "filesFound": 156
}
```

### Step 2: Configure Your Project

If not configured, run:

```
Use setup_wizard to configure project at C:\Users\you\your-actual-project
```

Smart Context will generate your exact configuration:

```json
{
  "success": true,
  "message": "🎉 Configuration generated! Follow these steps:",
  "steps": [
    "1. Open your Claude Desktop config at: %APPDATA%\\Claude\\claude_desktop_config.json",
    "2. Add this to the \"mcpServers\" section:",
    {
      "smart-context-my-project": {
        "command": "node",
        "args": ["C:\\smart-context-mcp\\src\\index.js"],
        "env": {
          "PROJECT_ROOT": "C:\\Users\\you\\my-project"
        }
      }
    }
  ]
}
```

### Step 3: Apply Configuration

1. **Open the config file**:
   - Windows: Press `Win+R`, type `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. **Add the generated configuration**:

```json
{
  "mcpServers": {
    "smart-context-my-project": {
      "command": "node",
      "args": ["C:\\smart-context-mcp\\src\\index.js"],
      "env": {
        "PROJECT_ROOT": "C:\\Users\\you\\my-project"  // 👈 YOUR project!
      }
    }
  }
}
```

3. **Restart Claude Desktop completely**

4. **Test it works**:
```
Find any JavaScript files in my project
```

## 🎯 Understanding the Setup

### Why PROJECT_ROOT is Required

```
┌─────────────────┐
│   Your Request  │
│ "Find auth code"│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ❓ Where to look?
│  Smart Context  │ ──────────────────────┐
└────────┬────────┘                       │
         │                                │
         │ PROJECT_ROOT tells me!         │
         ▼                                ▼
┌─────────────────┐            ┌──────────────────┐
│ C:\my-project\ │            │ C:\other-project\│
│  ├── src/       │            │  ├── app/        │
│  ├── auth.js ✓  │            │  └── main.py     │
│  └── user.js    │            └──────────────────┘
└─────────────────┘
```

### Common Setup Patterns

#### Single Project Developer
```json
{
  "mcpServers": {
    "smart-context": {
      "command": "node",
      "args": ["C:\\smart-context\\src\\index.js"],
      "env": {
        "PROJECT_ROOT": "C:\\my-main-project"
      }
    }
  }
}
```

#### Multiple Projects Developer
```json
{
  "mcpServers": {
    "smart-context-frontend": {
      "command": "node",
      "args": ["C:\\smart-context\\src\\index.js"],
      "env": { "PROJECT_ROOT": "C:\\projects\\web-app" }
    },
    "smart-context-backend": {
      "command": "node",
      "args": ["C:\\smart-context\\src\\index.js"],
      "env": { "PROJECT_ROOT": "C:\\projects\\api-server" }
    }
  }
}
```

## 🚨 Troubleshooting

### "No files found" Error

If you see this with the 🔴 icon:
```json
{
  "error": "No files found",
  "message": "🔴 SETUP REQUIRED: Smart Context doesn't know where your project is!",
  "quickFix": {
    "step1": "🆕 Run setup_wizard first:",
    "command": "setup_wizard({\"action\": \"check\"})"
  }
}
```

**Solution**: You haven't configured PROJECT_ROOT yet. Run the setup_wizard!

### "No files found" (After Setup)

If you see this without the 🔴 icon:
```json
{
  "error": "No files found",
  "message": "No code files found in C:\\wrong\\path",
  "checklist": [
    "Is this the correct project directory?",
    "Does it contain code files?"
  ]
}
```

**Solution**: PROJECT_ROOT is set to the wrong directory.

## 💡 Pro Tips

### 1. Name Your Projects Clearly
```json
"smart-context-company-website": { ... },
"smart-context-personal-blog": { ... },
"smart-context-client-xyz": { ... }
```

### 2. Use the Wizard for Each Project
Don't manually edit configs - let the wizard generate them:
```
setup_wizard({"action": "configure", "projectPath": "C:\\new-project", "projectName": "New Project"})
```

### 3. Check Your Setup Regularly
```
setup_wizard({"action": "check"})
```

### 4. Debug Mode
If something's not working:
```json
"env": {
  "PROJECT_ROOT": "C:\\my-project",
  "SMART_CONTEXT_DEBUG": "1"
}
```

## 🎉 Success Indicators

You know it's working when:

1. ✅ `setup_wizard` shows "configured" status
2. ✅ File searches return actual files from YOUR project
3. ✅ No more "SETUP REQUIRED" errors
4. ✅ Context selection includes your project files

## 📞 Still Need Help?

1. Run `setup_wizard({"action": "check"})` and share the output
2. Check the log file if debug mode is enabled
3. Make sure paths use double backslashes on Windows
4. Verify Claude Desktop was fully restarted

Remember: Smart Context is powerful because it analyzes YOUR actual code - but it needs to know where that code lives!