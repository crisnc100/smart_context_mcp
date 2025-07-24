import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

async function runAllTests() {
  console.log('🚀 Smart Context Pruning MCP Server - Complete Test Suite\n');

  // Start server with test project
  const testProjectPath = path.join(process.cwd(), 'test-project');
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['src/index.js'],
    env: {
      ...process.env,
      PROJECT_ROOT: testProjectPath
    }
  });

  const client = new Client({
    name: 'test-runner',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: Debug Mode - Notification Issue
    console.log('=' .repeat(60));
    console.log('TEST 1: Debug Mode - Notification Issue');
    console.log('=' .repeat(60));
    
    const debugResult = await client.callTool('get_optimal_context', {
      task: "Debug why notifications aren't showing after a user follows someone. The follow action works but no notification appears.",
      currentFile: "src/components/UserProfile.jsx",
      targetTokens: 4000,
      conversationId: "test-debug-1"
    });
    
    const debugContext = JSON.parse(debugResult.content[0].text);
    
    console.log(`\nTask Mode Detected: ${debugContext.taskMode}`);
    console.log(`Query Interpretation:`);
    console.log(`  Intent: ${debugContext.queryInterpretation.intent}`);
    console.log(`  Concepts: ${debugContext.queryInterpretation.concepts.join(', ')}`);
    console.log(`  Entities:`);
    if (debugContext.queryInterpretation.entities.functions.length > 0) {
      console.log(`    Functions: ${debugContext.queryInterpretation.entities.functions.join(', ')}`);
    }
    
    console.log(`\nContext Selection (${debugContext.context.included.length} files):`);
    debugContext.context.included.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.path}`);
      console.log(`     Relevance: ${file.relevanceScore} | Confidence: ${file.confidence}`);
      console.log(`     Reasons: ${file.reasons.join(', ')}`);
      console.log(`     Tokens: ${file.tokens}`);
    });
    
    console.log(`\nExcluded but Notable:`);
    debugContext.context.excluded.slice(0, 3).forEach(file => {
      console.log(`  - ${file.path} (${file.score})`);
      console.log(`    Reason: ${file.reasons.join(', ')}`);
    });

    // Test 2: Feature Mode - Add Dashboard
    console.log('\n\n' + '=' .repeat(60));
    console.log('TEST 2: Feature Mode - Add Dashboard Component');
    console.log('=' .repeat(60));
    
    const featureResult = await client.callTool('get_optimal_context', {
      task: "Implement a new dashboard component that shows user statistics including follower count and notification metrics",
      currentFile: "src/components/NotificationList.jsx",
      targetTokens: 5000,
      progressiveLevel: 2
    });
    
    const featureContext = JSON.parse(featureResult.content[0].text);
    
    console.log(`\nTask Mode Detected: ${featureContext.taskMode}`);
    console.log(`Files Selected: ${featureContext.context.included.length}`);
    console.log(`Token Usage: ${featureContext.usage.percentUsed} of budget`);
    
    console.log('\nTop relevant files:');
    featureContext.context.included.slice(0, 5).forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.path} (${file.relevanceScore})`);
    });

    // Test 3: Refactor Mode
    console.log('\n\n' + '=' .repeat(60));
    console.log('TEST 3: Refactor Mode - Authentication Service');
    console.log('=' .repeat(60));
    
    const refactorResult = await client.callTool('get_optimal_context', {
      task: "Refactor the authentication service to use dependency injection and improve testability",
      currentFile: "src/features/auth/auth.service.js",
      targetTokens: 6000
    });
    
    const refactorContext = JSON.parse(refactorResult.content[0].text);
    
    console.log(`\nTask Mode Detected: ${refactorContext.taskMode}`);
    console.log('Files that import or are imported by auth.service.js:');
    refactorContext.context.included.forEach(file => {
      if (file.reasons.some(r => r.includes('Import relationship') || r.includes('Direct dependency'))) {
        console.log(`  - ${file.path}`);
      }
    });

    // Test 4: Semantic Search
    console.log('\n\n' + '=' .repeat(60));
    console.log('TEST 4: Semantic Code Search');
    console.log('=' .repeat(60));
    
    const searchResult = await client.callTool('search_codebase', {
      query: "error handling and validation",
      limit: 5
    });
    
    const searchData = JSON.parse(searchResult.content[0].text);
    
    console.log(`\nSearch: "${searchData.query}"`);
    console.log('Results:');
    searchData.results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.file} (${result.similarity})`);
      if (result.matchedConcepts.length > 0) {
        console.log(`     Matched: ${result.matchedConcepts.join(', ')}`);
      }
    });

    // Test 5: Record feedback and get insights
    console.log('\n\n' + '=' .repeat(60));
    console.log('TEST 5: Learning System');
    console.log('=' .repeat(60));
    
    // Simulate successful task completion
    await client.callTool('record_session_outcome', {
      sessionId: debugContext.sessionId,
      wasSuccessful: true,
      filesActuallyUsed: [
        "src/components/UserProfile.jsx",
        "src/features/notifications/follow.notification.js",
        "src/services/notification.service.js"
      ]
    });
    
    console.log('\n✅ Recorded successful outcome for debug session');
    
    // Get learning insights
    const insightsResult = await client.callTool('get_learning_insights', {});
    const insights = JSON.parse(insightsResult.content[0].text);
    
    console.log('\nLearning System Insights:');
    console.log(`  Total Sessions: ${insights.summary.totalSessions}`);
    console.log(`  Success Rate: ${insights.summary.overallSuccessRate}`);
    console.log(`  Most Successful Mode: ${insights.summary.mostSuccessfulMode}`);
    
    if (insights.taskModeStats.length > 0) {
      console.log('\nStats by Task Mode:');
      insights.taskModeStats.forEach(stat => {
        console.log(`  ${stat.task_mode}: ${stat.session_count} sessions, ${stat.successRate} success`);
      });
    }

    // Test 6: Progressive Context Expansion
    console.log('\n\n' + '=' .repeat(60));
    console.log('TEST 6: Progressive Context Loading');
    console.log('=' .repeat(60));
    
    // Level 1: Immediate context
    const level1Result = await client.callTool('get_optimal_context', {
      task: "Add error handling to the notification service",
      currentFile: "src/services/notification.service.js",
      targetTokens: 3000,
      progressiveLevel: 1
    });
    const level1 = JSON.parse(level1Result.content[0].text);
    
    // Level 3: Comprehensive context
    const level3Result = await client.callTool('get_optimal_context', {
      task: "Add error handling to the notification service",
      currentFile: "src/services/notification.service.js",
      targetTokens: 3000,
      progressiveLevel: 3
    });
    const level3 = JSON.parse(level3Result.content[0].text);
    
    console.log(`\nProgressive Loading Comparison:`);
    console.log(`  Level 1 (Immediate): ${level1.context.included.length} files, ${level1.usage.totalTokens} tokens`);
    console.log(`  Level 3 (Comprehensive): ${level3.context.included.length} files, ${level3.usage.totalTokens} tokens`);
    
    // Show suggestions
    if (level1.suggestions.length > 0) {
      console.log('\nSuggestions from Level 1:');
      level1.suggestions.forEach(s => {
        console.log(`  - ${s.message}`);
      });
    }

    console.log('\n\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.close();
    process.exit(0);
  }
}

runAllTests().catch(console.error);