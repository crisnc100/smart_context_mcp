#!/usr/bin/env node

import { ContextPackageGenerator } from './src/contextPackageGenerator.js';
import { initDatabase, db } from './src/database-sqljs.js';

async function test() {
  console.log('🔍 Debugging extraction...\n');
  
  await initDatabase();
  const projectRoot = '/mnt/c/Users/crisn/GitHub/smart-context-demo';
  const generator = new ContextPackageGenerator(projectRoot, db);
  
  // Test the extraction directly
  const understanding = {
    problemDescription: 'getTotalPrice returns NaN',
    concepts: [],
    entities: []
  };
  
  const filePath = '/mnt/c/Users/crisn/GitHub/smart-context-demo/src/context/CartContext.js';
  
  console.log('Testing findTargetFunction...');
  const func = await generator.findTargetFunction(understanding, filePath);
  console.log('Result:', func);
  
  if (func) {
    console.log('\nTesting extractFunctionCode...');
    const code = await generator.extractFunctionCode(filePath, func);
    console.log('Code:', code.substring(0, 200));
  }
  
  console.log('\nTesting extractRelevantSection...');
  const section = await generator.extractRelevantSection(filePath, understanding, 500);
  console.log('Section:', section);
  
  process.exit(0);
}

test().catch(console.error);