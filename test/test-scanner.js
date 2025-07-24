import { FileScanner } from '../src/fileScanner.js';
import { ContextAnalyzer } from '../src/contextAnalyzer-pure.js';
import { initDatabase, db } from '../src/database-sqljs.js';
import path from 'path';

async function testScanner() {
  console.log('🔍 Testing File Scanner and Context Analyzer\n');

  // Initialize database
  await initDatabase();

  // Test project path
  const testProjectPath = path.join(process.cwd(), 'test-project');
  
  // Initialize scanner
  const scanner = new FileScanner(testProjectPath);
  
  console.log('📂 Scanning test project...');
  const files = scanner.scanCodebase();
  
  console.log(`\nFound ${files.length} files:`);
  files.forEach(file => {
    console.log(`  📄 ${file.path}`);
    console.log(`     - Size: ${file.size} bytes`);
    console.log(`     - Imports: ${file.imports.length} modules`);
    console.log(`     - Exports: ${file.exports.length} items`);
    console.log(`     - Functions: ${file.functions.length}`);
    console.log(`     - Classes: ${file.classes.length}`);
    console.log(`     - Has tests: ${file.hasTests}`);
    console.log(`     - Complexity: ${(file.complexity * 100).toFixed(0)}%`);
  });

  // Test import relationships
  console.log('\n🔗 Import Relationships:');
  files.forEach(file => {
    if (file.imports.length > 0) {
      console.log(`\n  ${file.path} imports:`);
      file.imports.forEach(imp => {
        console.log(`    ← ${imp}`);
      });
    }
  });

  // Test context analysis
  console.log('\n\n🧠 Testing Context Analysis...\n');
  
  const analyzer = new ContextAnalyzer(testProjectPath);
  
  // Test Case 1: Debug notification issue
  console.log('Test Case 1: Debug notification issue');
  const debugContext = await analyzer.getOptimalContext({
    task: "Fix the notification system not showing after user follows someone",
    currentFile: "src/components/UserProfile.jsx",
    targetTokens: 4000,
    projectFiles: files,
    progressiveLevel: 1
  });
  
  console.log(`  Task Mode: ${debugContext.taskMode}`);
  console.log(`  Query Analysis:`);
  console.log(`    - Intent: ${debugContext.queryAnalysis.intent}`);
  console.log(`    - Concepts: ${debugContext.queryAnalysis.concepts.join(', ')}`);
  console.log(`  Files included (${debugContext.included.length}):`);
  debugContext.included.forEach(file => {
    console.log(`    ✓ ${file.path} (${(file.score * 100).toFixed(0)}% relevance)`);
    console.log(`      Reasons: ${file.reasons.join(', ')}`);
  });

  // Test Case 2: Feature development
  console.log('\n\nTest Case 2: Add new dashboard feature');
  const featureContext = await analyzer.getOptimalContext({
    task: "Add a new dashboard component to display user analytics",
    currentFile: "src/components/NotificationList.jsx",
    targetTokens: 5000,
    projectFiles: files,
    progressiveLevel: 2
  });
  
  console.log(`  Task Mode: ${featureContext.taskMode}`);
  console.log(`  Files included (${featureContext.included.length}):`);
  featureContext.included.slice(0, 5).forEach(file => {
    console.log(`    ✓ ${file.path} (${(file.score * 100).toFixed(0)}% relevance)`);
  });

  // Test Case 3: Refactoring
  console.log('\n\nTest Case 3: Refactor authentication service');
  const refactorContext = await analyzer.getOptimalContext({
    task: "Refactor the authentication service to use JWT tokens",
    currentFile: "src/features/auth/auth.service.js",
    targetTokens: 6000,
    projectFiles: files
  });
  
  console.log(`  Task Mode: ${refactorContext.taskMode}`);
  console.log(`  Files included (${refactorContext.included.length}):`);
  refactorContext.included.slice(0, 5).forEach(file => {
    console.log(`    ✓ ${file.path} (${(file.score * 100).toFixed(0)}% relevance)`);
  });

  // Show token usage
  console.log('\n\n📊 Token Usage Summary:');
  console.log(`  Debug task: ${debugContext.totalTokens}/${debugContext.tokenBudget} tokens`);
  console.log(`  Feature task: ${featureContext.totalTokens}/${featureContext.tokenBudget} tokens`);
  console.log(`  Refactor task: ${refactorContext.totalTokens}/${refactorContext.tokenBudget} tokens`);

  // Close database
  db.close();
  
  console.log('\n✅ Testing complete!');
}

testScanner().catch(console.error);