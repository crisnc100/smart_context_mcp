#!/usr/bin/env node

import { FileScanner } from './src/fileScanner.js';

async function test() {
  console.log('Testing FileScanner...');
  const scanner = new FileScanner('/mnt/c/Users/crisn/GitHub/smart-context-demo');
  
  console.log('Starting scan...');
  const files = await scanner.scanCodebase();
  console.log(`Found ${files.length} files`);
  
  if (files.length > 0) {
    console.log('Sample files:', files.slice(0, 3).map(f => f.path));
  }
}

test().catch(console.error);