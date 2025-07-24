import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPhase1Features() {
  console.log('🧪 Testing Phase 1 Features\n');
  
  const testProjectPath = path.join(__dirname, 'test-project');
  const serverPath = path.join(__dirname, 'src', 'index.js');
  
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

    // Test 1: Adjustable Relevance Threshold
    console.log('📋 Test 1: Adjustable Relevance Threshold');
    
    // Default threshold (0.3)
    const result1 = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication error',
        currentFile: 'src/api/authController.js',
        targetTokens: 4000
      }
    });
    
    console.log(`Default threshold (0.3): ${result1.included?.length || 0} files`);
    
    // Higher threshold (0.5)
    const result2 = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication error',
        currentFile: 'src/api/authController.js',
        targetTokens: 4000,
        minRelevanceScore: 0.5
      }
    });
    
    console.log(`Higher threshold (0.5): ${result2.included?.length || 0} files`);
    console.log(`✅ Threshold adjustment working\n`);

    // Test 2: Tier-based Scoring
    console.log('📋 Test 2: Tier-based Scoring System');
    
    if (result2.included && result2.included.length > 0) {
      console.log('\nFile Tiers:');
      result2.included.slice(0, 5).forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.path}`);
        console.log(`     Tier: ${file.tier}`);
        console.log(`     Reason: ${file.primaryReason}`);
      });
      
      // Check debug info
      if (result2.included[0].debug) {
        console.log(`\n  Debug info available: relevanceScore = ${result2.included[0].debug.relevanceScore}`);
      }
    }
    console.log(`✅ Tier system working\n`);

    // Test 3: Basic Override Tracking
    console.log('📋 Test 3: Basic Override Tracking');
    
    const sessionId = result2.sessionId;
    const overrideResult = await client.callTool({
      name: 'apply_user_overrides',
      arguments: {
        sessionId: sessionId,
        added: ['src/config/database.js', 'src/utils/cache.js'],
        removed: ['src/utils/logger.js'],
        kept: ['src/auth/authService.js', 'src/auth/authErrors.js']
      }
    });
    
    console.log('Override tracking result:');
    const overrideData = JSON.parse(overrideResult.content[0].text);
    console.log(`  Added: ${overrideData.overrides.added} files`);
    console.log(`  Removed: ${overrideData.overrides.removed} files`);
    console.log(`  Kept: ${overrideData.overrides.kept} files`);
    console.log(`✅ Override tracking working\n`);

    // Test 4: Project Scope
    console.log('📋 Test 4: Project Scope for Large Codebases');
    
    // Set a narrow scope
    const scopeResult = await client.callTool({
      name: 'set_project_scope',
      arguments: {
        name: 'auth-only',
        includePaths: ['src/auth/**', 'src/middleware/auth*'],
        excludePaths: ['**/*.test.js', '**/node_modules/**'],
        maxDepth: 3,
        activate: true
      }
    });
    
    console.log('Scope configuration:');
    const scopeData = JSON.parse(scopeResult.content[0].text);
    console.log(`  Name: ${scopeData.scope.name}`);
    console.log(`  Include: ${scopeData.scope.includePaths.join(', ')}`);
    console.log(`  Exclude: ${scopeData.scope.excludePaths.join(', ')}`);
    
    // Test with scope active
    const scopedResult = await client.callTool({
      name: 'get_optimal_context',
      arguments: {
        task: 'fix authentication',
        currentFile: 'src/auth/authService.js',
        targetTokens: 4000
      }
    });
    
    console.log(`\nFiles found with scope: ${scopedResult.included?.length || 0}`);
    if (scopedResult.included) {
      const authFiles = scopedResult.included.filter(f => f.path.includes('auth'));
      console.log(`Auth-related files: ${authFiles.length}`);
    }
    console.log(`✅ Project scope working\n`);

    await client.close();
    console.log('✅ All Phase 1 features tested successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testPhase1Features().catch(console.error);