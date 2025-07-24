#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Available commands
const commands = {
  'start': 'Start the Smart Context MCP server',
  'init': 'Initialize configuration in current directory',
  'test': 'Run tests on current project',
  'analyze': 'Analyze current project structure',
  'help': 'Show this help message'
};

// Show help
if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(`
Smart Context MCP Server - Intelligent file context selection for LLMs

Usage: smart-context <command> [options]

Commands:
${Object.entries(commands).map(([cmd, desc]) => `  ${cmd.padEnd(10)} ${desc}`).join('\n')}

Options:
  --project-root <path>  Set project root directory (default: current directory)
  --config <path>        Use custom configuration file
  --port <number>        Port for server (if applicable)
  --verbose              Enable verbose logging

Examples:
  smart-context start                    # Start server for current directory
  smart-context start --project-root .   # Explicit project root
  smart-context init                     # Create config file
  smart-context test                     # Test context selection
  smart-context analyze                  # Show project analysis

Environment Variables:
  PROJECT_ROOT                 Project directory to analyze
  SMART_CONTEXT_TOKEN_BUDGET   Override default token budget
  SMART_CONTEXT_CONFIG         Path to configuration file
`);
  process.exit(0);
}

// Parse options
const options = {
  projectRoot: process.cwd(),
  config: null,
  verbose: false
};

for (let i = 1; i < args.length; i++) {
  switch (args[i]) {
    case '--project-root':
      options.projectRoot = path.resolve(args[++i]);
      break;
    case '--config':
      options.config = path.resolve(args[++i]);
      break;
    case '--verbose':
      options.verbose = true;
      break;
  }
}

// Command handlers
async function startServer() {
  console.log('🚀 Starting Smart Context MCP Server...');
  console.log(`📁 Project root: ${options.projectRoot}`);
  
  const serverPath = path.join(__dirname, '..', 'src', 'index.js');
  
  const env = {
    ...process.env,
    PROJECT_ROOT: options.projectRoot
  };
  
  if (options.config) {
    env.SMART_CONTEXT_CONFIG = options.config;
  }
  
  const child = spawn('node', [serverPath], {
    env,
    stdio: 'inherit'
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(code);
    }
  });
}

async function initConfig() {
  console.log('📝 Initializing Smart Context configuration...');
  
  const configPath = path.join(process.cwd(), '.smart-context-config.json');
  
  if (fs.existsSync(configPath)) {
    console.log('⚠️  Configuration file already exists');
    return;
  }
  
  const defaultConfig = {
    "context": {
      "defaultTokenBudget": 6000,
      "minRelevanceScore": 0.3,
      "progressiveLevels": {
        "immediate": 0.6,
        "expanded": 0.4,
        "comprehensive": 0.2
      }
    },
    "fileScanning": {
      "maxFileSize": 1048576,
      "ignorePatterns": [
        "node_modules/**",
        ".git/**",
        "dist/**",
        "build/**",
        "*.log"
      ]
    },
    "git": {
      "recentChangesHours": 48,
      "defaultCommitLimit": 100
    },
    "learning": {
      "learningRate": 0.1,
      "confidenceIncrement": 0.05
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log('✅ Created .smart-context-config.json');
}

async function testProject() {
  console.log('🧪 Testing Smart Context on current project...');
  console.log(`📁 Project root: ${options.projectRoot}`);
  
  const testPath = path.join(__dirname, '..', 'test', 'test-scanner.js');
  
  const env = {
    ...process.env,
    PROJECT_ROOT: options.projectRoot
  };
  
  const child = spawn('node', [testPath], {
    env,
    stdio: 'inherit'
  });
  
  child.on('exit', (code) => {
    process.exit(code);
  });
}

async function analyzeProject() {
  console.log('📊 Analyzing project structure...');
  console.log(`📁 Project root: ${options.projectRoot}`);
  
  // Import modules dynamically
  const { OptimizedFileScanner } = await import('../src/fileScanner-optimized.js');
  const { GitAnalyzer } = await import('../src/gitAnalyzer.js');
  
  // Scan files
  const scanner = new OptimizedFileScanner(options.projectRoot, {
    parallel: true,
    enableCache: true
  });
  
  console.log('\n📂 Scanning files...');
  const files = await scanner.scanCodebase();
  
  // Analyze by extension
  const extensions = {};
  const imports = new Set();
  let totalSize = 0;
  let totalComplexity = 0;
  
  files.forEach(file => {
    const ext = file.extension || 'no-extension';
    if (!extensions[ext]) {
      extensions[ext] = { count: 0, size: 0 };
    }
    extensions[ext].count++;
    extensions[ext].size += file.size;
    totalSize += file.size;
    totalComplexity += file.complexity || 0;
    
    file.imports.forEach(imp => imports.add(imp));
  });
  
  console.log(`\n📊 Project Statistics:`);
  console.log(`  Total files: ${files.length}`);
  console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Average complexity: ${(totalComplexity / files.length * 100).toFixed(1)}%`);
  console.log(`  Unique imports: ${imports.size}`);
  
  console.log(`\n📁 Files by extension:`);
  Object.entries(extensions)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([ext, data]) => {
      console.log(`  ${ext}: ${data.count} files (${(data.size / 1024).toFixed(1)} KB)`);
    });
  
  // Check git status
  const gitAnalyzer = new GitAnalyzer(options.projectRoot);
  const isGit = await gitAnalyzer.checkGitRepo();
  
  if (isGit) {
    console.log('\n🔄 Git repository detected');
    const recentFiles = await gitAnalyzer.getRecentlyModifiedFiles(24);
    if (recentFiles.length > 0) {
      console.log(`  Recently modified (24h): ${recentFiles.length} files`);
    }
  } else {
    console.log('\n⚠️  Not a git repository');
  }
  
  // Show errors if any
  const errors = scanner.getErrors();
  if (errors.length > 0) {
    console.log(`\n⚠️  Scanning errors: ${errors.length}`);
    errors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }
  
  console.log('\n✅ Analysis complete!');
}

// Execute command
switch (command) {
  case 'start':
    startServer();
    break;
  case 'init':
    await initConfig();
    break;
  case 'test':
    await testProject();
    break;
  case 'analyze':
    await analyzeProject();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run "smart-context help" for usage information');
    process.exit(1);
}