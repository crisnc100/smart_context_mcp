#!/usr/bin/env node

import { ContextPackageGenerator } from './src/contextPackageGenerator.js';
import { initDatabase, db } from './src/database-sqljs.js';

async function test() {
  console.log('🔧 Testing Enhanced Context Package Generator\n');
  
  // Initialize database
  await initDatabase();
  
  // Test project path
  const projectRoot = '/mnt/c/Users/crisn/GitHub/smart-context-demo';
  
  // Initialize generator
  const generator = new ContextPackageGenerator(projectRoot, db);
  
  // Test with specific query
  const query = 'getTotalPrice returns NaN when cart has items';
  const currentFile = 'src/context/CartContext.js';
  
  console.log(`Query: "${query}"`);
  console.log(`Current File: ${currentFile}\n`);
  
  try {
    const pkg = await generator.generateContextPackage(query, {
      tokenBudget: 2000,
      currentFile: currentFile
    });
    
    console.log('✅ Package Generated Successfully!\n');
    
    // Show what we extracted
    console.log('📄 Core Implementation:');
    if (pkg.context.coreImplementation.code) {
      console.log(`Location: ${pkg.context.coreImplementation.location}`);
      console.log(`Function: ${pkg.context.coreImplementation.function || 'N/A'}`);
      console.log('Code (first 300 chars):');
      console.log(pkg.context.coreImplementation.code.substring(0, 300));
    } else {
      console.log('No code extracted');
    }
    
    console.log('\n📊 Usage Patterns:');
    if (pkg.context.usage && pkg.context.usage.length > 0) {
      console.log(`Found ${pkg.context.usage.length} usage(s)`);
      pkg.context.usage.forEach((u, i) => {
        console.log(`  ${i+1}. ${u.file}:${u.line} - ${u.code}`);
      });
    } else {
      console.log('No usage patterns found');
    }
    
    console.log('\n🔗 Relationships:');
    console.log('Imports:', pkg.relationships.dependencies?.length || 0);
    console.log('Exports:', pkg.relationships.provides?.length || 0);
    console.log('Tests:', pkg.relationships.tests?.length || 0);
    
    console.log('\n✅ Checklist:');
    pkg.checklist.slice(0, 5).forEach(item => {
      console.log(`  □ ${item}`);
    });
    
    console.log('\n📊 Token Usage:');
    console.log(`Budget: ${pkg.metadata.tokenBudget}`);
    console.log(`Used: ${pkg.metadata.approxTokens}`);
    console.log(`Efficiency: ${((pkg.metadata.approxTokens / pkg.metadata.tokenBudget) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

test().catch(console.error);