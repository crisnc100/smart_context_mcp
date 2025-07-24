import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSimpleTests() {
  console.log('🧪 Smart Context MCP Server - Simple Integration Test\n');
  
  const testProjectPath = path.join(__dirname, 'test-project');
  const serverPath = path.join(__dirname, 'src', 'index.js');
  
  // Test 1: Basic functionality
  console.log('📋 Test 1: Basic Context Selection');
  console.log(`Project Path: ${testProjectPath}`);
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: {
      ...process.env,
      PROJECT_ROOT: testProjectPath
    }
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Get optimal context for auth debugging
    console.log('🔍 Scenario: "Fix authentication error when session expires"');
    const result = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication error when session expires',
        currentFile: 'src/api/authController.js',
        targetTokens: 4000
      }
    });

    console.log('\n📊 Results:');
    console.log(`Session ID: ${result.sessionId}`);
    console.log(`Task Mode: ${result.taskMode}`);
    console.log(`Files Selected: ${result.included.length}`);
    console.log(`Total Tokens: ${result.totalTokens}`);
    
    console.log('\n📁 Top 5 Selected Files:');
    result.included.slice(0, 5).forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file.path}`);
      console.log(`     Score: ${file.relevance.toFixed(3)} - ${file.reason}`);
    });

    // Record outcome
    console.log('\n📝 Recording successful outcome...');
    await client.callTool({
      name: 'record_session_outcome',
      arguments: {
        sessionId: result.sessionId,
        wasSuccessful: true,
        filesActuallyUsed: [
          'src/auth/authService.js',
          'src/auth/authErrors.js',
          'src/middleware/authMiddleware.js'
        ]
      }
    });
    console.log('✅ Outcome recorded');

    // Test search
    console.log('\n🔍 Testing semantic search...');
    const searchResult = await client.callTool({
      name: 'search_codebase',
      arguments: {
        query: 'session expiration error handling',
        limit: 3
      }
    });

    console.log('\n🔎 Search Results:');
    searchResult.results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.path} (score: ${result.score.toFixed(2)})`);
    });

    await client.close();
    console.log('\n✅ Test 1 completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }

  // Test 2: CLI tool
  console.log('\n\n📋 Test 2: CLI Tool - Analyze Command');
  
  const cliProcess = spawn('node', [
    path.join(__dirname, 'bin', 'smart-context.js'),
    'analyze',
    '--project-root', testProjectPath
  ], {
    stdio: 'inherit'
  });
  
  await new Promise(resolve => cliProcess.on('exit', resolve));
  
  // Test 3: Error handling
  console.log('\n\n📋 Test 3: Error Handling - Large Files');
  
  const largePath = path.join(testProjectPath, 'large-test.js');
  const largeContent = 'const data = "' + 'x'.repeat(2 * 1024 * 1024) + '";\n';
  await fs.promises.writeFile(largePath, largeContent);
  
  console.log('✅ Created 2MB test file');
  console.log('Running analysis with file size limits...\n');
  
  const cliProcess2 = spawn('node', [
    path.join(__dirname, 'bin', 'smart-context.js'),
    'analyze',
    '--project-root', testProjectPath
  ], {
    stdio: 'inherit'
  });
  
  await new Promise(resolve => cliProcess2.on('exit', resolve));
  
  // Cleanup
  await fs.promises.unlink(largePath);
  
  // Test 4: Claude Desktop instructions
  console.log('\n\n📋 Claude Desktop Configuration');
  console.log('================================\n');
  
  const absolutePath = path.resolve(serverPath);
  const projectPath = path.resolve(testProjectPath);
  
  console.log('1. Find your Claude Desktop config file:');
  console.log('   Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
  console.log('   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
  console.log('   Linux: ~/.config/Claude/claude_desktop_config.json\n');
  
  console.log('2. Add this configuration:\n');
  
  const config = {
    "mcpServers": {
      "smart-context": {
        "command": "node",
        "args": [absolutePath],
        "env": {
          "PROJECT_ROOT": projectPath
        }
      }
    }
  };
  
  console.log('```json');
  console.log(JSON.stringify(config, null, 2));
  console.log('```\n');
  
  console.log('3. Save the file and restart Claude Desktop');
  console.log('4. The tools will be available in Claude\'s interface');
  
  console.log('\n✅ All tests completed!');
}

runSimpleTests().catch(console.error);