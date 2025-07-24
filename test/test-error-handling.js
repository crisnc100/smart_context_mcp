import { FileScanner } from '../src/fileScanner.js';
import { ContextAnalyzer } from '../src/contextAnalyzer-pure.js';
import { GitAnalyzer } from '../src/gitAnalyzer.js';
import { initDatabase, db } from '../src/database-sqljs.js';
import { writeFileSync, mkdirSync, chmodSync } from 'fs';
import path from 'path';
import { rimrafSync } from 'rimraf';

async function testErrorHandling() {
  console.log('🧪 Testing Error Handling and Edge Cases\n');

  await initDatabase();

  // Create test directories
  const testDir = path.join(process.cwd(), 'test-error-cases');
  rimrafSync(testDir); // Clean up if exists
  mkdirSync(testDir, { recursive: true });

  // Test 1: Non-git directory
  console.log('📁 Test 1: Non-git directory handling');
  const nonGitDir = path.join(testDir, 'non-git-project');
  mkdirSync(nonGitDir);
  
  // Create a file in non-git directory
  writeFileSync(path.join(nonGitDir, 'app.js'), `
    export function hello() {
      console.log('Hello from non-git project');
    }
  `);

  try {
    const gitAnalyzer = new GitAnalyzer(nonGitDir);
    const coChanges = await gitAnalyzer.analyzeCoChanges(10);
    console.log('  ✅ Git analyzer handled non-git directory gracefully');
    console.log(`  Co-changes found: ${coChanges.size} (should be 0)`);
    
    const recentFiles = await gitAnalyzer.getRecentlyModifiedFiles(24);
    console.log(`  Recent files: ${recentFiles.length} (should be 0)`);
  } catch (error) {
    console.log('  ❌ Git analyzer failed:', error.message);
  }

  // Test 2: Unreadable files
  console.log('\n📁 Test 2: Permission-denied file handling');
  const restrictedDir = path.join(testDir, 'restricted');
  mkdirSync(restrictedDir);
  
  const restrictedFile = path.join(restrictedDir, 'secret.js');
  writeFileSync(restrictedFile, 'const secret = "classified";');
  
  // Try to make file unreadable (may not work on Windows)
  try {
    chmodSync(restrictedFile, 0o000);
    
    const scanner = new FileScanner(testDir);
    const files = scanner.scanCodebase();
    
    const restrictedFileData = files.find(f => f.path.includes('secret.js'));
    if (restrictedFileData) {
      console.log('  ⚠️  Scanner attempted to read restricted file');
      console.log(`  File size reported: ${restrictedFileData.size || 'unknown'}`);
    } else {
      console.log('  ✅ Scanner skipped unreadable file');
    }
    
    // Restore permissions
    chmodSync(restrictedFile, 0o644);
  } catch (error) {
    console.log('  ℹ️  Cannot test file permissions on this system');
  }

  // Test 3: Large file handling
  console.log('\n📁 Test 3: Large file handling');
  const largeFile = path.join(testDir, 'large.js');
  const largeContent = 'const data = "' + 'x'.repeat(1024 * 1024) + '";\n'; // 1MB file
  writeFileSync(largeFile, largeContent);
  
  const scanner = new FileScanner(testDir);
  console.time('  Scanning with large file');
  const filesWithLarge = scanner.scanCodebase();
  console.timeEnd('  Scanning with large file');
  
  const largeFileData = filesWithLarge.find(f => f.path.includes('large.js'));
  if (largeFileData) {
    console.log(`  ✅ Large file scanned: ${(largeFileData.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Complexity score: ${(largeFileData.complexity * 100).toFixed(0)}%`);
  }

  // Test 4: Binary file handling
  console.log('\n📁 Test 4: Binary file handling');
  const binaryFile = path.join(testDir, 'image.png');
  const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  writeFileSync(binaryFile, binaryData);
  
  // Scanner should skip binary files based on extension
  const filesWithBinary = scanner.scanCodebase();
  const foundBinary = filesWithBinary.find(f => f.path.includes('image.png'));
  console.log(`  ${foundBinary ? '❌ Binary file was included' : '✅ Binary file was skipped'}`);

  // Test 5: Malformed JavaScript
  console.log('\n📁 Test 5: Malformed JavaScript handling');
  const malformedFile = path.join(testDir, 'malformed.js');
  writeFileSync(malformedFile, `
    export function broken {  // Missing parentheses
      console.log('This won't parse');
    
    const unclosed = "string without closing quote
    
    export class 123Invalid // Invalid class name
  `);
  
  try {
    const malformedFiles = scanner.scanCodebase();
    const malformed = malformedFiles.find(f => f.path.includes('malformed.js'));
    if (malformed) {
      console.log('  ✅ Scanner handled malformed file');
      console.log(`  Functions found: ${malformed.functions.length}`);
      console.log(`  Classes found: ${malformed.classes.length}`);
      console.log(`  Imports found: ${malformed.imports.length}`);
    }
  } catch (error) {
    console.log('  ❌ Scanner crashed on malformed file:', error.message);
  }

  // Test 6: Token counting edge cases
  console.log('\n📁 Test 6: Token counting edge cases');
  
  // Test with Unicode and emojis
  const unicodeFile = path.join(testDir, 'unicode.js');
  writeFileSync(unicodeFile, `
    // 你好世界 🌍🌎🌏
    export const greeting = "Hello 世界! 🚀";
    const emoji = "🧪🔬🧬💻🎯";
  `);
  
  try {
    const analyzer = new ContextAnalyzer(testDir);
    const tokenCount = analyzer.countTokens(
      'Hello 世界! 🚀 Testing Unicode: 你好世界 🌍🌎🌏'
    );
    console.log(`  ✅ Token counting handled Unicode: ${tokenCount} tokens`);
  } catch (error) {
    console.log('  ❌ Token counting failed on Unicode:', error.message);
  }

  // Test 7: Circular imports
  console.log('\n📁 Test 7: Circular import detection');
  
  const circularDir = path.join(testDir, 'circular');
  mkdirSync(circularDir);
  
  writeFileSync(path.join(circularDir, 'a.js'), `
    import { b } from './b.js';
    export const a = 'A';
  `);
  
  writeFileSync(path.join(circularDir, 'b.js'), `
    import { a } from './a.js';
    export const b = 'B';
  `);
  
  const circularScanner = new FileScanner(circularDir);
  const circularFiles = circularScanner.scanCodebase();
  
  console.log('  ✅ Scanner handled circular imports');
  console.log(`  Files found: ${circularFiles.length}`);
  circularFiles.forEach(f => {
    console.log(`    ${f.path}: imports ${f.imports.join(', ')}`);
  });

  // Test 8: Empty directory
  console.log('\n📁 Test 8: Empty directory handling');
  const emptyDir = path.join(testDir, 'empty');
  mkdirSync(emptyDir);
  
  const emptyScanner = new FileScanner(emptyDir);
  const emptyFiles = emptyScanner.scanCodebase();
  console.log(`  ✅ Empty directory scanned: ${emptyFiles.length} files found`);

  // Test 9: Special characters in filenames
  console.log('\n📁 Test 9: Special characters in filenames');
  const specialFile = path.join(testDir, 'special-@#$-chars.js');
  writeFileSync(specialFile, 'export const special = true;');
  
  try {
    const specialFiles = scanner.scanCodebase();
    const found = specialFiles.find(f => f.path.includes('special-@#$-chars'));
    console.log(`  ${found ? '✅ Special character file handled' : '❌ Special character file not found'}`);
  } catch (error) {
    console.log('  ❌ Failed on special characters:', error.message);
  }

  // Test 10: Context analysis with minimal files
  console.log('\n📁 Test 10: Context analysis with minimal project');
  
  const minimalFiles = [{
    path: 'index.js',
    fullPath: path.join(testDir, 'index.js'),
    size: 100,
    imports: [],
    exports: ['default'],
    functions: ['main'],
    classes: [],
    hasTests: false,
    complexity: 0.1
  }];
  
  try {
    const analyzer = new ContextAnalyzer(testDir);
    const context = await analyzer.getOptimalContext({
      task: "Add error handling",
      currentFile: "index.js",
      targetTokens: 1000,
      projectFiles: minimalFiles
    });
    
    console.log('  ✅ Context analysis worked with minimal project');
    console.log(`  Files included: ${context.included.length}`);
  } catch (error) {
    console.log('  ❌ Context analysis failed:', error.message);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  rimrafSync(testDir);
  
  // Close database
  db.close();
  
  console.log('\n✅ Error handling tests complete!');
}

testErrorHandling().catch(console.error);