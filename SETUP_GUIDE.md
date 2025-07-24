# Setup Guide for Smart Context Pruning MCP Server

## Installation Options

### Option 1: Standard Installation (Requires Build Tools)

If you have build tools installed (make, gcc, python), you can use the standard setup:

```bash
# On Ubuntu/WSL2:
sudo apt-get update && sudo apt-get install -y build-essential python3-dev

# On macOS:
# Build tools come with Xcode Command Line Tools
xcode-select --install

# Then install dependencies:
npm install
```

### Option 2: Pure JavaScript Installation (No Build Tools Required)

If you don't have build tools or prefer not to install them:

```bash
# 1. Use the pure JS package.json
cp package-pure-js.json package.json

# 2. Update imports to use pure JS versions
# In src/index.js, change:
# import { initDatabase } from './database.js';
# to:
# import { initDatabase } from './database-sqljs.js';

# Also change:
# import { ContextAnalyzer } from './contextAnalyzer.js';
# to:
# import { ContextAnalyzer } from './contextAnalyzer-pure.js';

# 3. Install pure JS dependencies
npm install
```

### Option 3: Manual Dependency Installation

Install dependencies one by one to identify issues:

```bash
# Install non-problematic packages first
npm install @modelcontextprotocol/sdk fs-extra glob ignore simple-git compromise stopword uuid nodemon

# Try native packages individually
npm install better-sqlite3  # If this fails, use sql.js instead
npm install tiktoken       # If this fails, use gpt-tokenizer instead
```

## Troubleshooting

### WSL2 Issues

If you're on WSL2 and get build errors:

1. **Missing make/gcc**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y build-essential python3-dev
   ```

2. **Permission issues**:
   Run WSL2 terminal as administrator or use the pure JS version.

### Native Module Errors

If you see errors like "gyp ERR! not found: make":

1. Install build tools (see Option 1)
2. OR use the pure JavaScript alternatives (see Option 2)

### Database Alternatives

**better-sqlite3** (native) → **sql.js** (pure JS)
- sql.js is slower but works everywhere
- No compilation required
- Stores database in memory, saves to disk periodically

### Token Counting Alternatives

**tiktoken** (native) → **gpt-tokenizer** (pure JS)
- gpt-tokenizer is pure JavaScript
- Slightly different token counts but close enough
- No compilation required

### NLP Alternatives

**natural** (native) → **compromise** (pure JS)
- compromise is pure JavaScript
- Good enough for basic NLP tasks
- No compilation required

## Quick Start Scripts

Create these helper scripts:

**install-pure.sh**:
```bash
#!/bin/bash
cp package-pure-js.json package.json
sed -i "s/database\.js/database-sqljs.js/g" src/index.js
sed -i "s/contextAnalyzer\.js/contextAnalyzer-pure.js/g" src/index.js
npm install
```

**install-native.sh**:
```bash
#!/bin/bash
cp package.json.original package.json  # Save original first
npm install
```

## Verifying Installation

After installation, test the server:

```bash
# Check if all modules load correctly
node -e "import('./src/index.js').then(() => console.log('✅ All modules loaded successfully')).catch(e => console.error('❌ Error:', e.message))"

# Run the test client
node test/test-client.js
```

## Environment-Specific Notes

### Windows (Native)
- Install Visual Studio Build Tools
- Use Node.js for Windows, not WSL

### macOS
- Install Xcode Command Line Tools: `xcode-select --install`
- Should work out of the box after that

### Linux
- Install build-essential: `sudo apt-get install build-essential`
- May need python3-dev: `sudo apt-get install python3-dev`

### Docker
- Use node:alpine image with build tools
- OR use pure JS version for smaller image

## Recommended Approach

For development: Use the pure JS version for easy setup
For production: Use native modules for better performance

The pure JS version is about 10-20% slower but works everywhere without compilation.