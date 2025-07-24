import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, db } from './src/database-sqljs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCompleteLearningCycle() {
  console.log('🧪 Testing Complete Learning Cycle\n');
  
  const testProjectPath = path.join(__dirname, 'test-project');
  const serverPath = path.join(__dirname, 'src', 'index.js');
  
  // Initialize database for direct queries
  await initDatabase();
  
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

    // Step 1: Initial query
    console.log('📋 Step 1: Initial Context Selection');
    console.log('Query: "Fix authentication error when session expires"\n');
    
    const result1 = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication error when session expires',
        currentFile: 'src/api/authController.js',
        targetTokens: 4000
      }
    });

    console.log(`Session ID: ${result1.sessionId}`);
    console.log(`Task Mode: ${result1.taskMode}`);
    console.log(`Files Selected: ${result1.included?.length || 0}`);
    
    if (result1.included && result1.included.length > 0) {
      console.log('\nInitial File Scores:');
      result1.included.slice(0, 5).forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.path}`);
        console.log(`     Score: ${file.relevance?.toFixed(3) || 'N/A'}`);
      });
    }

    // Step 2: Record successful outcome
    console.log('\n📝 Step 2: Recording Successful Outcome');
    console.log('Marking these files as actually helpful:');
    const helpfulFiles = [
      'src/auth/authService.js',
      'src/auth/authErrors.js',
      'src/middleware/authMiddleware.js'
    ];
    helpfulFiles.forEach(f => console.log(`  - ${f}`));
    
    await client.callTool({
      name: 'record_session_outcome',
      arguments: {
        sessionId: result1.sessionId,
        wasSuccessful: true,
        filesActuallyUsed: helpfulFiles
      }
    });
    console.log('✅ Outcome recorded\n');

    // Step 3: Check database for learning
    console.log('🔍 Step 3: Verifying Learning in Database');
    
    // Check if session was recorded
    const session = db.prepare('SELECT * FROM context_sessions WHERE id = ?').get(result1.sessionId);
    if (session) {
      console.log(`✅ Session ${result1.sessionId} recorded`);
      console.log(`   Task: ${session.task_description}`);
      console.log(`   Success: ${session.outcome_success ? 'Yes' : 'No'}`);
    }
    
    // Check file relevance updates
    const relevanceQuery = db.prepare(`
      SELECT file_path, relevance_score, success_count, total_count 
      FROM file_relevance 
      WHERE task_type LIKE '%auth%' 
      ORDER BY relevance_score DESC 
      LIMIT 5
    `);
    const relevanceData = relevanceQuery.all();
    
    if (relevanceData.length > 0) {
      console.log('\n📊 Updated File Relevance Scores:');
      relevanceData.forEach(row => {
        const successRate = row.total_count > 0 ? (row.success_count / row.total_count * 100).toFixed(0) : 0;
        console.log(`  ${row.file_path}`);
        console.log(`    Score: ${row.relevance_score.toFixed(3)}, Success: ${row.success_count}/${row.total_count} (${successRate}%)`);
      });
    }

    // Step 4: Run same query again
    console.log('\n🔄 Step 4: Running Same Query Again');
    
    const result2 = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication error when session expires',
        currentFile: 'src/api/authController.js',
        targetTokens: 4000
      }
    });

    console.log(`\nFiles Selected: ${result2.included?.length || 0}`);
    
    // Compare scores
    console.log('\n📈 Score Comparison for Learned Files:');
    helpfulFiles.forEach(filePath => {
      const before = result1.included?.find(f => f.path === filePath);
      const after = result2.included?.find(f => f.path === filePath);
      
      if (before && after) {
        const improvement = ((after.relevance - before.relevance) / before.relevance * 100).toFixed(1);
        console.log(`\n${filePath}:`);
        console.log(`  Before: ${before.relevance?.toFixed(3) || 'N/A'}`);
        console.log(`  After:  ${after.relevance?.toFixed(3) || 'N/A'} (${improvement}% change)`);
      } else {
        console.log(`\n${filePath}: Not found in both results`);
      }
    });

    // Step 5: Test learning insights
    console.log('\n📊 Step 5: Getting Learning Insights');
    
    const insights = await client.callTool({
      name: 'get_learning_insights',
      arguments: {
        taskMode: 'debug'
      }
    });
    
    console.log('\nLearning Insights:');
    console.log(`Total Sessions: ${insights.totalSessions || 0}`);
    console.log(`Success Rate: ${insights.successRate || 'N/A'}%`);
    
    if (insights.topFiles && insights.topFiles.length > 0) {
      console.log('\nMost Helpful Files:');
      insights.topFiles.slice(0, 5).forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.path} (${file.helpfulCount} times)`);
      });
    }

    await client.close();
    console.log('\n✅ Complete learning cycle test passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    db.close();
  }
}

testCompleteLearningCycle().catch(console.error);