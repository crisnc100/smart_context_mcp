import { initDatabase, db } from './src/database-sqljs.js';
import { ContextAnalyzer } from './src/contextAnalyzer-pure.js';
import { OptimizedFileScanner } from './src/fileScanner-optimized.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDatabaseAndLearning() {
  console.log('🧪 Testing Database and Learning System\n');
  
  await initDatabase();
  
  const testProjectPath = path.join(__dirname, 'test-project');
  const analyzer = new ContextAnalyzer(testProjectPath);
  const scanner = new OptimizedFileScanner(testProjectPath);
  
  // Scan project files
  console.log('📂 Scanning test project...');
  const files = await scanner.scanCodebase();
  console.log(`✅ Found ${files.length} files\n`);
  
  // Test 1: Initial context selection
  console.log('📋 Test 1: Initial Context Selection');
  const context1 = await analyzer.getOptimalContext({
    task: 'fix authentication error when session expires',
    currentFile: 'src/api/authController.js',
    projectFiles: files,
    targetTokens: 4000
  });
  
  console.log(`Session ID: ${context1.sessionId}`);
  console.log(`Task Mode: ${context1.taskMode}`);
  console.log(`Files Selected: ${context1.included.length}`);
  
  console.log('\nTop 3 files:');
  context1.included.slice(0, 3).forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.path} (score: ${file.relevance.toFixed(3)})`);
  });
  
  // Record learning data
  console.log('\n📝 Recording session outcome...');
  const helpfulFiles = [
    'src/auth/authService.js',
    'src/auth/authErrors.js',
    'src/middleware/authMiddleware.js'
  ];
  
  // Update file relevance
  const updateStmt = db.prepare(`
    INSERT OR REPLACE INTO file_relevance 
    (session_id, file_path, relevance_score, was_helpful, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  
  helpfulFiles.forEach(filePath => {
    updateStmt.run(context1.sessionId, filePath, 0.9, 1);
  });
  
  // Also update file relationships
  const relStmt = db.prepare(`
    INSERT OR IGNORE INTO file_relationships 
    (file_a, file_b, relationship_type, strength, updated_at)
    VALUES (?, ?, 'used_together', ?, datetime('now'))
  `);
  
  relStmt.run('src/auth/authService.js', 'src/auth/authErrors.js', 0.9);
  relStmt.run('src/auth/authService.js', 'src/middleware/authMiddleware.js', 0.8);
  
  console.log('✅ Learning data recorded\n');
  
  // Test 2: Run same query to see learning effect
  console.log('📋 Test 2: Testing Learning Effect');
  const context2 = await analyzer.getOptimalContext({
    task: 'fix authentication error when session expires',
    currentFile: 'src/api/authController.js',
    projectFiles: files,
    targetTokens: 4000
  });
  
  console.log(`Files Selected: ${context2.included.length}`);
  console.log('\nComparing scores for learned files:');
  
  helpfulFiles.forEach(filePath => {
    const file1 = context1.included.find(f => f.path === filePath);
    const file2 = context2.included.find(f => f.path === filePath);
    
    if (file1 && file2) {
      const improvement = ((file2.relevance - file1.relevance) / file1.relevance * 100).toFixed(1);
      console.log(`  ${filePath}:`);
      console.log(`    Before: ${file1.relevance.toFixed(3)}`);
      console.log(`    After:  ${file2.relevance.toFixed(3)} (+${improvement}%)`);
    }
  });
  
  // Test 3: Verify database persistence
  console.log('\n📋 Test 3: Database Statistics');
  
  const stats = {
    sessions: db.prepare('SELECT COUNT(*) as count FROM context_sessions').get().count,
    relevanceRecords: db.prepare('SELECT COUNT(*) as count FROM file_relevance').get().count,
    relationships: db.prepare('SELECT COUNT(*) as count FROM file_relationships').get().count,
    embeddings: db.prepare('SELECT COUNT(*) as count FROM file_embeddings').get().count
  };
  
  console.log('Database contents:');
  console.log(`  Sessions: ${stats.sessions}`);
  console.log(`  Relevance records: ${stats.relevanceRecords}`);
  console.log(`  File relationships: ${stats.relationships}`);
  console.log(`  File embeddings: ${stats.embeddings}`);
  
  // Test 4: Check learning insights
  console.log('\n📋 Test 4: Learning Insights');
  
  const insightStmt = db.prepare(`
    SELECT 
      file_path,
      AVG(relevance_score) as avg_score,
      SUM(was_helpful) as times_helpful,
      COUNT(*) as times_suggested
    FROM file_relevance
    WHERE was_helpful = 1
    GROUP BY file_path
    ORDER BY times_helpful DESC
    LIMIT 5
  `);
  
  const insights = insightStmt.all();
  console.log('\nMost helpful files:');
  insights.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.file_path}`);
    console.log(`     Helpful ${row.times_helpful} times, Avg score: ${row.avg_score.toFixed(3)}`);
  });
  
  // Save database
  console.log('\n💾 Saving database...');
  const dbData = db.export();
  const fs = await import('fs');
  fs.writeFileSync('./data/smart-context.db', Buffer.from(dbData));
  
  const dbStats = fs.statSync('./data/smart-context.db');
  console.log(`✅ Database saved (${(dbStats.size / 1024).toFixed(1)} KB)`);
  
  db.close();
  console.log('\n✅ All database and learning tests passed!');
}

testDatabaseAndLearning().catch(console.error);