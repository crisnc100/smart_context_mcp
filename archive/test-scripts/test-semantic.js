#!/usr/bin/env node

import { SemanticSearch } from './src/semanticSearch.js';
import { FileScanner } from './src/fileScanner.js';

async function test() {
  console.log('Testing SemanticSearch...');
  
  const search = new SemanticSearch();
  const scanner = new FileScanner('/mnt/c/Users/crisn/GitHub/smart-context-demo');
  
  // Analyze query
  console.log('Analyzing query...');
  const query = 'getTotalPrice returns NaN';
  const analysis = search.analyzeQuery(query);
  console.log('Analysis:', {
    intent: analysis.intent,
    concepts: analysis.concepts,
    tokens: analysis.tokens?.slice(0, 5)
  });
  
  // Get files
  console.log('\nScanning files...');
  const files = await scanner.scanCodebase();
  console.log(`Found ${files.length} files`);
  
  // Find similar
  console.log('\nFinding similar files...');
  const similar = await search.findSimilarFiles(analysis, files, 5);
  console.log('Similar files:', similar);
}

test().catch(console.error);