#!/usr/bin/env node

import { ContextPackageGenerator } from './src/contextPackageGenerator.js';
import { initDatabase, db } from './src/database-sqljs.js';

async function test() {
  console.log('Testing ContextPackageGenerator...');
  
  // Initialize database
  console.log('Initializing database...');
  await initDatabase();
  console.log('Database ready');
  
  // Test project path
  const projectRoot = '/mnt/c/Users/crisn/GitHub/smart-context-demo';
  
  // Initialize generator
  console.log('Creating generator...');
  const generator = new ContextPackageGenerator(projectRoot, db);
  console.log('Generator created');
  
  // Simple test
  const query = 'getTotalPrice returns NaN';
  
  console.log(`\nGenerating package for: "${query}"`);
  console.log('Starting generation...');
  
  try {
    const pkg = await generator.generateContextPackage(query, {
      tokenBudget: 2000
    });
    
    console.log('\nPackage generated!');
    console.log('Summary:', pkg.summary);
    console.log('Problem:', pkg.problem);
    console.log('Files:', pkg.metadata?.relevantFiles?.length || 0);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

test().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});