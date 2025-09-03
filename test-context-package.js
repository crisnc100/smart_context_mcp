#!/usr/bin/env node

import { ContextPackageGenerator } from './src/contextPackageGenerator.js';
import { initDatabase, db } from './src/database-sqljs.js';
import path from 'path';

async function test() {
  console.log('🚀 Testing Context Package Generator\n');
  
  // Initialize database
  await initDatabase();
  
  // Test project path (our demo)
  const projectRoot = '/mnt/c/Users/crisn/GitHub/smart-context-demo';
  
  // Initialize generator
  const generator = new ContextPackageGenerator(projectRoot, db);
  
  // Test queries
  const testCases = [
    {
      name: 'Debugging Query',
      query: 'getTotalPrice returns NaN when cart has items',
      currentFile: 'src/context/CartContext.js'
    },
    {
      name: 'Feature Query',
      query: 'add discount code feature to shopping cart',
      currentFile: 'src/components/Cart.js'
    },
    {
      name: 'Vague Query',
      query: 'fix the cart',
      currentFile: null
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Test: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    if (test.currentFile) console.log(`Current File: ${test.currentFile}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      const contextPkg = await generator.generateContextPackage(test.query, {
        tokenBudget: 4000,
        currentFile: test.currentFile,
        conversationId: `test-${Date.now()}`
      });
      
      // Display results
      console.log('📊 Summary:');
      console.log(`  - Task Mode: ${contextPkg.summary.taskMode}`);
      console.log(`  - Confidence: ${(contextPkg.summary.confidence * 100).toFixed(0)}%`);
      console.log(`  - Interpretation: ${contextPkg.summary.interpretation}`);
      
      console.log('\n🎯 Problem Analysis:');
      console.log(`  - Description: ${contextPkg.problem.description}`);
      console.log(`  - Location: ${contextPkg.problem.likelyLocation}`);
      if (contextPkg.problem.errorType) {
        console.log(`  - Error Type: ${contextPkg.problem.errorType}`);
      }
      
      console.log('\n📁 Relevant Files:');
      contextPkg.metadata.relevantFiles.slice(0, 5).forEach(f => {
        console.log(`  - ${f.path} (${(f.relevance * 100).toFixed(0)}%): ${f.reason}`);
      });
      
      console.log('\n✅ Checklist:');
      contextPkg.checklist.forEach(item => {
        console.log(`  □ ${item}`);
      });
      
      if (contextPkg.suggestedFix && contextPkg.suggestedFix.confidence > 0.5) {
        console.log('\n💡 Suggested Fix:');
        console.log(`  Pattern: ${contextPkg.suggestedFix.pattern}`);
        console.log(`  Causes: ${contextPkg.suggestedFix.possibleCauses.join(', ')}`);
        console.log(`  Example: ${contextPkg.suggestedFix.example}`);
      }
      
      console.log('\n📊 Metadata:');
      console.log(`  - Token Budget: ${contextPkg.metadata.tokenBudget}`);
      console.log(`  - Approx Tokens Used: ${contextPkg.metadata.approxTokens}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Testing Complete!');
}

test().catch(console.error);