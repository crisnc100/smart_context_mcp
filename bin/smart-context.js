#!/usr/bin/env node

// This is the executable entry point for the npm package
// When used with MCP, this just runs the server directly

import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For MCP usage, we just run the server directly
// The PROJECT_ROOT will be set by Claude Desktop config
const indexPath = path.join(__dirname, '..', 'src', 'index.js');
const indexUrl = pathToFileURL(indexPath).href;
import(indexUrl);