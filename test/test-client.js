import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testServer() {
  console.log('🚀 Starting Smart Context Pruning MCP Server test...\n');

  // Spawn the server process
  const serverProcess = spawn('node', ['src/index.js'], {
    env: {
      ...process.env,
      PROJECT_ROOT: process.cwd()
    }
  });

  // Create client transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['src/index.js'],
    env: {
      ...process.env,
      PROJECT_ROOT: process.cwd()
    }
  });

  // Create client
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log('✅ Connected to server\n');

    // List available tools
    const tools = await client.listTools();
    console.log('📋 Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Test 1: Get optimal context for a debugging task
    console.log('🧪 Test 1: Get optimal context for debugging task');
    const debugContext = await client.callTool('get_optimal_context', {
      task: "Fix user authentication not working after login",
      currentFile: "src/auth/login.js",
      targetTokens: 4000,
      conversationId: "test-conv-1"
    });
    
    const debugResult = JSON.parse(debugContext.content[0].text);
    console.log(`  Task Mode: ${debugResult.taskMode}`);
    console.log(`  Intent: ${debugResult.queryInterpretation.intent}`);
    console.log(`  Concepts: ${debugResult.queryInterpretation.concepts.join(', ')}`);
    console.log(`  Files included: ${debugResult.context.included.length}`);
    console.log(`  Token usage: ${debugResult.usage.percentUsed} of budget`);
    
    if (debugResult.context.included.length > 0) {
      console.log('\n  Top 3 included files:');
      debugResult.context.included.slice(0, 3).forEach(file => {
        console.log(`    - ${file.path} (${file.relevanceScore} relevance, ${file.confidence} confidence)`);
        console.log(`      Reasons: ${file.reasons.join(', ')}`);
      });
    }
    console.log('');

    // Test 2: Semantic search
    console.log('🧪 Test 2: Semantic codebase search');
    const searchResults = await client.callTool('search_codebase', {
      query: "database connection handling",
      limit: 5
    });
    
    const searchData = JSON.parse(searchResults.content[0].text);
    console.log(`  Query interpretation:`)
    console.log(`    Intent: ${searchData.interpretation.intent}`);
    console.log(`    Concepts: ${searchData.interpretation.concepts.join(', ')}`);
    console.log(`\n  Top results:`);
    searchData.results.forEach(result => {
      console.log(`    - ${result.file} (${result.similarity} similarity)`);
      if (result.matchedConcepts.length > 0) {
        console.log(`      Matched concepts: ${result.matchedConcepts.join(', ')}`);
      }
    });
    console.log('');

    // Test 3: Record session outcome
    console.log('🧪 Test 3: Record session outcome');
    await client.callTool('record_session_outcome', {
      sessionId: debugResult.sessionId,
      wasSuccessful: true,
      filesActuallyUsed: debugResult.context.included.slice(0, 2).map(f => f.path)
    });
    console.log('  ✅ Session outcome recorded\n');

    // Test 4: Get learning insights
    console.log('🧪 Test 4: Get learning insights');
    const insights = await client.callTool('get_learning_insights', {});
    const insightsData = JSON.parse(insights.content[0].text);
    console.log(`  Total sessions: ${insightsData.summary.totalSessions}`);
    console.log(`  Overall success rate: ${insightsData.summary.overallSuccessRate}`);
    console.log(`  Most successful mode: ${insightsData.summary.mostSuccessfulMode}`);
    console.log('');

    // Test 5: Feature development context
    console.log('🧪 Test 5: Get optimal context for feature development');
    const featureContext = await client.callTool('get_optimal_context', {
      task: "Add a new dashboard component to display user analytics",
      currentFile: "src/components/Dashboard.jsx",
      targetTokens: 5000,
      progressiveLevel: 2
    });
    
    const featureResult = JSON.parse(featureContext.content[0].text);
    console.log(`  Task Mode: ${featureResult.taskMode}`);
    console.log(`  Files included: ${featureResult.context.included.length}`);
    console.log(`  Suggestions: ${featureResult.suggestions.length > 0 ? featureResult.suggestions[0].message : 'None'}`);
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    await client.close();
    serverProcess.kill();
    process.exit(0);
  }
}

// Run tests
testServer().catch(console.error);