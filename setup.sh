#!/bin/bash

echo "Setting up Smart Context Pruning MCP Server..."
echo ""

# Check if running on WSL
if grep -qi microsoft /proc/version; then
    echo "Detected WSL environment"
    echo "Please ensure you have build tools installed by running:"
    echo "  sudo apt-get update && sudo apt-get install -y build-essential python3-dev"
    echo ""
fi

# Try to install without native dependencies first
echo "Installing JavaScript-only dependencies..."
npm install @modelcontextprotocol/sdk fs-extra glob ignore simple-git compromise stopword uuid nodemon

# Check if better-sqlite3 can be installed
echo ""
echo "Attempting to install better-sqlite3..."
if npm install better-sqlite3; then
    echo "✅ better-sqlite3 installed successfully"
else
    echo "❌ Failed to install better-sqlite3"
    echo ""
    echo "Alternative: You can use the pure JavaScript 'sql.js' instead."
    echo "To do this, we'll need to modify the database.js file."
    echo ""
    echo "Would you like to:"
    echo "1. Install build tools (requires sudo): sudo apt-get install build-essential python3-dev"
    echo "2. Use sql.js instead (pure JavaScript, no compilation needed)"
    echo ""
fi

# Try to install tiktoken
echo ""
echo "Attempting to install tiktoken..."
if npm install tiktoken; then
    echo "✅ tiktoken installed successfully"
else
    echo "❌ Failed to install tiktoken"
    echo "We can use a JavaScript alternative for token counting."
fi

echo ""
echo "Setup complete!"
echo ""
echo "To start the server: npm start"