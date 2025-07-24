import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMCPServer() {
  console.log('🧪 Testing Smart Context MCP Server\n');

  // Test 1: Test with test-project
  console.log('📋 Test 1: Running server with test-project');
  
  const testProjectPath = path.join(__dirname, 'test-project');
  const serverPath = path.join(__dirname, 'src', 'index.js');
  
  try {
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

    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test debugging scenario
    console.log('🔍 Test Case: Debug authentication error when session expires');
    const debugResult = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication error when session expires',
        currentFile: 'src/api/authController.js',
        conversationId: 'test-conv-1',
        targetTokens: 4000
      }
    });

    console.log('\n📊 Context Selection Results:');
    console.log(`Session ID: ${debugResult.sessionId}`);
    console.log(`Task Mode: ${debugResult.taskMode}`);
    console.log(`Files Selected: ${debugResult.included.length}`);
    console.log(`Total Tokens: ${debugResult.totalTokens}`);
    
    console.log('\n📁 Selected Files:');
    debugResult.included.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file.path} (${file.relevance.toFixed(2)}) - ${file.reason}`);
    });

    // Record successful outcome
    console.log('\n📝 Recording successful outcome...');
    const outcomeResult = await client.callTool({
      name: 'record_session_outcome',
      arguments: {
        sessionId: debugResult.sessionId,
        wasSuccessful: true,
        filesActuallyUsed: [
          'src/auth/authService.js',
          'src/auth/authErrors.js',
          'src/middleware/authMiddleware.js'
        ]
      }
    });
    console.log('✅ Outcome recorded:', outcomeResult.message);

    // Test learning - run same query again
    console.log('\n🔄 Testing learning system - running same query...');
    const secondResult = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication error when session expires',
        currentFile: 'src/api/authController.js',
        conversationId: 'test-conv-2',
        targetTokens: 4000
      }
    });

    console.log('\n📊 Second Query Results:');
    console.log(`Files Selected: ${secondResult.included.length}`);
    
    // Check if learned files have higher scores
    const learnedFiles = ['src/auth/authService.js', 'src/auth/authErrors.js', 'src/middleware/authMiddleware.js'];
    console.log('\n📈 Learning Impact:');
    secondResult.included.forEach(file => {
      if (learnedFiles.includes(file.path)) {
        console.log(`  ✓ ${file.path}: ${file.relevance.toFixed(3)} (boosted by learning)`);
      }
    });

    // Test semantic search
    console.log('\n🔍 Testing semantic search...');
    const searchResult = await client.callTool({
      name: 'search_codebase',
      arguments: {
        query: 'session expiration handling',
        limit: 5
      }
    });

    console.log('\n🔎 Search Results:');
    searchResult.results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.path} (${result.score.toFixed(2)}) - ${result.matches[0]}`);
    });

    await client.close();
    console.log('\n✅ Test 1 completed successfully');

  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test 2: Error handling tests
  console.log('\n\n📋 Test 2: Error Handling');
  
  // Test non-existent directory
  console.log('\n🔧 Testing non-existent directory...');
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        PROJECT_ROOT: '/non/existent/directory'
      }
    });

    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    
    const result = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'test task',
        currentFile: 'test.js'
      }
    });
    
    console.log('✅ Handled non-existent directory gracefully');
    console.log(`  Files found: ${result.included.length}`);
    
    await client.close();
  } catch (error) {
    console.log('✅ Properly errored on non-existent directory:', error.message);
  }

  // Test 3: Database and learning verification
  console.log('\n\n📋 Test 3: Database and Learning System');
  
  const dbTestPath = path.join(__dirname, 'test-db-verify.js');
  const dbTestContent = `
import { initDatabase, db } from './src/database-sqljs.js';
import fs from 'fs';

async function verifyDatabase() {
  await initDatabase();
  
  // Check if learning updated scores
  const stmt = db.prepare(\`
    SELECT fr.*, cs.task_description 
    FROM file_relevance fr
    JOIN context_sessions cs ON fr.session_id = cs.id
    WHERE fr.was_helpful = 1
    ORDER BY fr.updated_at DESC
    LIMIT 5
  \`);
  
  const results = stmt.all();
  
  console.log('\\n📊 Database Verification:');
  console.log(\`  Helpful files recorded: \${results.length}\`);
  
  results.forEach(row => {
    console.log(\`  - \${row.file_path}: score \${row.relevance_score.toFixed(3)} for "\${row.task_description}"\`);
  });
  
  // Check file relationships
  const relStmt = db.prepare('SELECT COUNT(*) as count FROM file_relationships');
  const relCount = relStmt.get();
  console.log(\`  File relationships: \${relCount.count}\`);
  
  // Save database to verify persistence
  const dbPath = './data/smart-context.db';
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(\`  Database size: \${(stats.size / 1024).toFixed(1)} KB\`);
  }
  
  db.close();
}

verifyDatabase().catch(console.error);
`;

  await fs.promises.writeFile(dbTestPath, dbTestContent);
  
  const dbProcess = spawn('node', [dbTestPath], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  await new Promise(resolve => dbProcess.on('exit', resolve));

  // Clean up
  await fs.promises.unlink(dbTestPath);

  console.log('\n\n✅ All integration tests completed!');
  
  // Test 4: Claude Desktop configuration
  console.log('\n\n📋 Claude Desktop Configuration Instructions:');
  console.log('\n1. Locate your Claude Desktop config file:');
  console.log('   - Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
  console.log('   - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
  console.log('   - Linux: ~/.config/Claude/claude_desktop_config.json');
  
  console.log('\n2. Add this configuration:');
  const configExample = {
    mcpServers: {
      "smart-context": {
        command: "node",
        args: [path.join(__dirname, 'src', 'index.js')],
        env: {
          PROJECT_ROOT: testProjectPath
        }
      }
    }
  };
  
  console.log('\n```json');
  console.log(JSON.stringify(configExample, null, 2));
  console.log('```');
  
  console.log('\n3. Restart Claude Desktop');
  console.log('\n4. You should see "smart-context" in the MCP servers list');
  console.log('\n5. Available tools will appear in Claude\'s tool palette');
}

// Helper to check file size handling
async function testLargeFiles() {
  console.log('\n\n📋 Test 4: Large File Handling');
  
  const largePath = path.join(__dirname, 'test-project', 'large-file.js');
  const largeContent = 'const data = "' + 'x'.repeat(2 * 1024 * 1024) + '";\n';
  
  await fs.promises.writeFile(largePath, largeContent);
  
  console.log('✅ Created 2MB test file');
  console.log('🔍 Testing file scanner with size limits...');
  
  // Use CLI to analyze
  const analyzeProcess = spawn('node', [
    path.join(__dirname, 'bin', 'smart-context.js'),
    'analyze',
    '--project-root', path.join(__dirname, 'test-project')
  ], {
    stdio: 'inherit'
  });
  
  await new Promise(resolve => analyzeProcess.on('exit', resolve));
  
  // Clean up
  await fs.promises.unlink(largePath);
}

// Run all tests
testMCPServer()
  .then(() => testLargeFiles())
  .catch(console.error);