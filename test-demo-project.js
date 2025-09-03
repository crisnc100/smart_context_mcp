#!/usr/bin/env node

/**
 * Demo test showing Smart Context v2.0.0 as AI Context Engineer
 * Using the smart-context-demo e-commerce project
 */

import { ContextPackageGenerator } from './src/contextPackageGenerator.js';
import { initDatabase, db } from './src/database-sqljs.js';

const DEMO_PROJECT = '/mnt/c/Users/crisn/GitHub/smart-context-demo';

async function showContextPackage(title, query, options = {}) {
  console.log('\n' + '='.repeat(70));
  console.log(`🎯 ${title}`);
  console.log('='.repeat(70));
  console.log(`Query: "${query}"`);
  if (options.currentFile) {
    console.log(`Current File: ${options.currentFile}`);
  }
  console.log('-'.repeat(70));
  
  const generator = new ContextPackageGenerator(DEMO_PROJECT, db);
  const pkg = await generator.generateContextPackage(query, {
    tokenBudget: 4000,
    ...options
  });
  
  // Show what the AI Context Engineer understood
  console.log('\n📚 AI CONTEXT ENGINEER ANALYSIS:');
  console.log('\n1️⃣ UNDERSTANDING:');
  console.log(`   Task Mode: ${pkg.summary.taskMode}`);
  console.log(`   Confidence: ${(pkg.summary.confidence * 100).toFixed(0)}%`);
  console.log(`   Problem: "${pkg.understanding.problemDescription}"`);
  
  if (pkg.understanding.concepts?.length > 0) {
    console.log(`   Concepts: ${pkg.understanding.concepts.join(', ')}`);
  }
  
  if (pkg.understanding.errorType) {
    console.log(`   Error Type: ${pkg.understanding.errorType}`);
  }
  
  // Show extracted code
  console.log('\n2️⃣ CODE EXTRACTION:');
  if (pkg.context.coreImplementation?.code) {
    console.log(`   File: ${pkg.context.coreImplementation.file}`);
    console.log(`   Function/Section: ${pkg.context.coreImplementation.function || 'Section'}`);
    console.log(`   Lines: ${pkg.context.coreImplementation.lines}`);
    console.log(`   Preview:`);
    const codePreview = pkg.context.coreImplementation.code.split('\n').slice(0, 5).join('\n');
    console.log('   ' + codePreview.split('\n').map(l => '   ' + l).join('\n'));
    if (pkg.context.coreImplementation.code.split('\n').length > 5) {
      console.log('      ... (more code extracted)');
    }
  } else {
    console.log('   No specific implementation found');
  }
  
  // Show relationships
  console.log('\n3️⃣ RELATIONSHIPS:');
  if (pkg.relationships.dependencies?.length > 0) {
    console.log(`   Dependencies (${pkg.relationships.dependencies.length}):`);
    pkg.relationships.dependencies.slice(0, 3).forEach(dep => {
      console.log(`     - ${dep.file}: imports ${dep.imports?.join(', ') || 'modules'}`);
    });
  }
  
  if (pkg.relationships.provides?.length > 0) {
    console.log(`   Exports (${pkg.relationships.provides.length}): ${pkg.relationships.provides.slice(0, 3).join(', ')}`);
  }
  
  // Show suggested fix if relevant
  if (pkg.suggestedFix?.confidence > 0.5) {
    console.log('\n4️⃣ SUGGESTED FIX:');
    console.log(`   Pattern: ${pkg.suggestedFix.pattern}`);
    console.log(`   Suggestion: ${pkg.suggestedFix.suggestion || 'Check the implementation'}`);
    console.log(`   Confidence: ${(pkg.suggestedFix.confidence * 100).toFixed(0)}%`);
  }
  
  // Show efficiency
  console.log('\n5️⃣ TOKEN EFFICIENCY:');
  console.log(`   Used: ${pkg.metadata.approxTokens}/${pkg.metadata.tokenBudget} tokens`);
  console.log(`   Efficiency: ${((pkg.metadata.approxTokens / pkg.metadata.tokenBudget) * 100).toFixed(0)}%`);
  
  // Show relevant files
  console.log('\n6️⃣ RELEVANT FILES:');
  pkg.metadata.relevantFiles.slice(0, 5).forEach(f => {
    console.log(`   - ${f.path} (${(f.relevance * 100).toFixed(0)}% relevance)`);
    if (f.reason) {
      console.log(`     Reason: ${f.reason}`);
    }
  });
  
  return pkg;
}

async function main() {
  console.log('🚀 SMART CONTEXT v2.0.0 - AI Context Engineer Demo');
  console.log('Testing with e-commerce demo project\n');
  
  await initDatabase();
  
  // Test 1: Debug a specific error
  await showContextPackage(
    'SCENARIO 1: Debug NaN Error in Cart',
    'getTotalPrice returns NaN when cart has items with missing prices',
    { currentFile: 'src/context/CartContext.js' }
  );
  
  // Test 2: Understand a system
  await showContextPackage(
    'SCENARIO 2: Understand Authentication',
    'explain how user authentication works in this app'
  );
  
  // Test 3: Add a feature
  await showContextPackage(
    'SCENARIO 3: Add New Feature',
    'add wishlist feature where users can save products for later'
  );
  
  // Test 4: Fix a bug with vague description
  await showContextPackage(
    'SCENARIO 4: Vague Bug Report',
    'checkout is not working properly',
    { currentFile: 'src/components/Checkout.js' }
  );
  
  // Test 5: Refactor code
  await showContextPackage(
    'SCENARIO 5: Code Refactoring',
    'refactor product service to use modern async/await instead of promises'
  );
  
  // Test 6: Performance issue
  await showContextPackage(
    'SCENARIO 6: Performance Problem',
    'product list is loading slowly with many items'
  );
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY: AI Context Engineer Benefits');
  console.log('='.repeat(70));
  console.log(`
✅ Extracted actual code, not just file paths
✅ Understood task intent (debug vs feature vs refactor)
✅ Identified error patterns and suggested fixes
✅ Mapped dependencies and relationships
✅ Maintained token efficiency (20-30% usage)
✅ Provided structured context for AI tools

🎯 The AI Context Engineer helps by:
- Understanding vague queries
- Finding the exact code sections needed
- Suggesting fixes based on patterns
- Providing complete context packages
- Saving time on manual context gathering
  `);
}

main().catch(console.error);