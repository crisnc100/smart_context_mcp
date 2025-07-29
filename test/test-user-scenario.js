// Test the exact scenario from user feedback
// Query: "exercise naming formatting variation names"
// Target file: exerciseFormatters.ts with functions constructExerciseName, formatOptionName

import { FileScanner } from '../src/fileScanner.js';
import { ContextAnalyzer } from '../src/contextAnalyzer-pure.js';
import { SemanticSearch } from '../src/semanticSearch.js';
import { initDatabase } from '../src/database-sqljs.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test project structure
function createTestProject() {
  const testDir = path.join(__dirname, 'test-exercise-project');
  
  // Clean up if exists
  try {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  } catch (e) {}
  
  mkdirSync(testDir, { recursive: true });
  mkdirSync(path.join(testDir, 'src'), { recursive: true });
  mkdirSync(path.join(testDir, 'src/utils'), { recursive: true });
  mkdirSync(path.join(testDir, 'src/services'), { recursive: true });
  
  // Create the target file that user was looking for
  const exerciseFormattersContent = `
export function constructExerciseName(exercise: Exercise): string {
  const { name, variation, equipment } = exercise;
  return \`\${name}\${variation ? ' - ' + formatVariation(variation) : ''}\`;
}

export function formatOptionName(option: ExerciseOption): string {
  return option.name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

export function formatVariation(variation: string): string {
  return variation.replace(/_/g, ' ').toLowerCase();
}

export const exerciseNameFormatter = {
  construct: constructExerciseName,
  formatOption: formatOptionName,
  formatVariation
};
`;

  // Create some other files that might match
  const exerciseServiceContent = `
import { constructExerciseName } from '../utils/exerciseFormatters';

export class ExerciseService {
  getFormattedExercises() {
    return this.exercises.map(ex => ({
      ...ex,
      displayName: constructExerciseName(ex)
    }));
  }
}
`;

  const namingUtilsContent = `
// General naming utilities
export function formatName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateName(name: string): boolean {
  return name.length > 0 && name.length < 100;
}
`;

  // Write files
  writeFileSync(path.join(testDir, 'src/utils/exerciseFormatters.ts'), exerciseFormattersContent);
  writeFileSync(path.join(testDir, 'src/services/exerciseService.ts'), exerciseServiceContent);
  writeFileSync(path.join(testDir, 'src/utils/namingUtils.ts'), namingUtilsContent);
  
  return testDir;
}

async function runTest() {
  console.log('🧪 Testing User Scenario: Finding exercise formatting functions\n');
  
  // Initialize
  await initDatabase();
  const testDir = createTestProject();
  
  // Test queries from user feedback
  const testQueries = [
    "exercise naming formatting variation names",  // Original user query
    "format exercise name",                       // Simpler version
    "constructExerciseName",                      // Direct function name
    "exercise formatter"                          // Pattern-based
  ];
  
  console.log('📁 Created test project with files:');
  console.log('  - src/utils/exerciseFormatters.ts (TARGET FILE)');
  console.log('  - src/services/exerciseService.ts');
  console.log('  - src/utils/namingUtils.ts\n');
  
  // Initialize components
  const scanner = new FileScanner(testDir);
  const analyzer = new ContextAnalyzer(testDir);
  const semanticSearch = new SemanticSearch();
  
  // Scan files
  const files = scanner.scanCodebase();
  console.log(`Found ${files.length} files\n`);
  
  // Test each query
  for (const query of testQueries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Query: "${query}"`);
    console.log('='.repeat(60));
    
    // Test semantic search
    const queryAnalysis = semanticSearch.analyzeQuery(query);
    console.log('\n🔍 Query Analysis:');
    console.log(`  Concepts: ${queryAnalysis.concepts.join(', ')}`);
    console.log(`  Tokens: ${queryAnalysis.tokens.join(', ')}`);
    console.log(`  Function hints: ${queryAnalysis.functionHints?.join(', ') || 'none'}`);
    console.log(`  File hints: ${queryAnalysis.fileHints?.join(', ') || 'none'}`);
    
    // Test semantic similarity
    console.log('\n📊 Semantic Search Results:');
    const searchResults = await semanticSearch.findSimilarFiles(queryAnalysis, files, 5);
    searchResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.file} - ${(result.similarity * 100).toFixed(0)}%`);
    });
    
    // Test full context analysis
    const context = await analyzer.getOptimalContext({
      task: query,
      projectFiles: files,
      targetTokens: 8000,
      minRelevanceScore: 0.15
    });
    
    console.log('\n📦 Context Analysis Results:');
    console.log(`  Included files: ${context.included.length}`);
    console.log(`  Task mode: ${context.taskMode}`);
    
    if (context.included.length > 0) {
      console.log('\n  Files included:');
      context.included.forEach((file, i) => {
        console.log(`    ${i + 1}. ${file.path}`);
        console.log(`       Score: ${file.score.toFixed(2)}`);
        console.log(`       Reasons: ${file.reasons.join(', ')}`);
      });
    } else {
      console.log('  ❌ NO FILES INCLUDED (This is the problem!)');
    }
    
    // Check if we found the target file
    const foundTarget = context.included.some(f => 
      f.path.includes('exerciseFormatters')
    );
    console.log(`\n  ✅ Found target file: ${foundTarget ? 'YES' : 'NO'}`);
  }
  
  // Test with explicit function extraction
  console.log('\n\n📐 Function Extraction Test:');
  files.forEach(file => {
    if (file.functions.length > 0) {
      console.log(`\n  ${file.path}:`);
      console.log(`    Functions: ${file.functions.join(', ')}`);
    }
  });
  
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
}

// Run the test
runTest().catch(console.error);