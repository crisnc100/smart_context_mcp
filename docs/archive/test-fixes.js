import { OptimizedFileScanner } from './src/fileScanner-optimized.js';
import { GitAnalyzer } from './src/gitAnalyzer.js';
import { initDatabase, db } from './src/database-sqljs.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFixes() {
  console.log('🧪 Testing Fixes\n');
  
  const testProjectPath = path.join(__dirname, 'test-project');
  
  // Test 1: Git Analyzer
  console.log('📋 Test 1: Git Analyzer Fix');
  const gitAnalyzer = new GitAnalyzer(testProjectPath);
  
  try {
    const isGit = await gitAnalyzer.checkGitRepo();
    console.log(`✅ Git repo check: ${isGit}`);
    
    if (isGit) {
      const recentFiles = await gitAnalyzer.getRecentlyModifiedFiles(48);
      console.log(`✅ Recent files found: ${recentFiles.length}`);
      
      const coChanges = await gitAnalyzer.analyzeCoChanges(10);
      console.log(`✅ Co-change patterns analyzed: ${coChanges.size}`);
    }
  } catch (error) {
    console.error('❌ Git analyzer error:', error.message);
  }
  
  // Test 2: Database Schema
  console.log('\n📋 Test 2: Database Schema');
  await initDatabase();
  
  try {
    // Check file_relevance table structure
    const tableInfo = db.prepare("PRAGMA table_info(file_relevance)").all();
    console.log('\nfile_relevance columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Test insert with correct schema
    const testInsert = db.prepare(`
      INSERT OR REPLACE INTO file_relevance 
      (file_path, task_type, task_mode, relevance_score, confidence)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    testInsert.run('test.js', 'auth', 'debug', 0.8, 0.7);
    console.log('✅ Database insert successful');
    
    // Check context_sessions table
    const sessionInfo = db.prepare("PRAGMA table_info(context_sessions)").all();
    console.log('\ncontext_sessions columns:');
    sessionInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
  
  // Test 3: File Scanner
  console.log('\n📋 Test 3: File Scanner');
  const scanner = new OptimizedFileScanner(testProjectPath);
  
  try {
    const files = await scanner.scanCodebase();
    console.log(`✅ Files scanned: ${files.length}`);
    
    const errors = scanner.getErrors();
    if (errors.length > 0) {
      console.log(`⚠️  Scanning errors: ${errors.length}`);
      errors.slice(0, 3).forEach(err => {
        console.log(`  - ${err.file}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('❌ Scanner error:', error.message);
  }
  
  db.close();
  console.log('\n✅ All tests completed!');
}

testFixes().catch(console.error);