#!/usr/bin/env node

import { ScopedFileScanner } from './src/fileScanner-scoped.js';

async function test() {
  const projectRoot = '/mnt/c/Users/crisn/GitHub/smart-context-demo';
  const scanner = new ScopedFileScanner(projectRoot);
  
  console.log('Scanning files...');
  const files = await scanner.scanCodebase();
  
  console.log(`Found ${files.length} files:\n`);
  files.forEach(f => {
    console.log(`  ${f.path}`);
  });
}

test().catch(console.error);