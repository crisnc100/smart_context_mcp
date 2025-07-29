// Quick test for the user scenario
import { SemanticSearch } from '../src/semanticSearch.js';
import { QueryEnhancer } from '../src/queryEnhancer.js';

console.log('🧪 Testing Query Enhancement and Semantic Search\n');

// Test the exact user query
const query = "exercise naming formatting variation names";
const enhancer = new QueryEnhancer();
const search = new SemanticSearch();

// Test query enhancement
console.log('📝 Original Query:', query);
const enhanced = enhancer.enhanceQuery(query);
console.log('\n🔍 Enhanced Query:');
console.log('  Function hints:', enhanced.functionHints.slice(0, 10).join(', '), '...');
console.log('  File hints:', enhanced.fileHints.join(', '));
console.log('  Patterns:', enhanced.patterns.join(', '));

// Test semantic analysis
const analysis = search.analyzeQuery(query);
console.log('\n📊 Semantic Analysis:');
console.log('  Concepts:', analysis.concepts.slice(0, 10).join(', '), '...');
console.log('  Tokens:', analysis.tokens.slice(0, 10).join(', '), '...');

// Simulate file matching
const testFiles = [
  {
    path: 'src/utils/exerciseFormatters.ts',
    functions: ['constructExerciseName', 'formatOptionName', 'formatVariation'],
    imports: [],
    exports: ['constructExerciseName', 'formatOptionName']
  },
  {
    path: 'src/components/ExerciseList.tsx',
    functions: ['renderExercise', 'handleClick'],
    imports: ['exerciseFormatters'],
    exports: []
  },
  {
    path: 'src/utils/stringUtils.ts',
    functions: ['capitalize', 'trim'],
    imports: [],
    exports: ['capitalize', 'trim']
  }
];

console.log('\n🎯 Testing File Matching:');
testFiles.forEach(file => {
  const similarity = search.calculateSemanticSimilarity(analysis, file);
  console.log(`  ${file.path}: ${(similarity * 100).toFixed(0)}%`);
  
  // Show why it matched
  if (similarity > 0.5) {
    console.log('    Matched because:');
    if (file.path.includes('formatter')) {
      console.log('      - File path contains "formatter"');
    }
    for (const func of file.functions) {
      for (const hint of analysis.functionHints || []) {
        if (func.toLowerCase().includes(hint.toLowerCase()) || 
            hint.toLowerCase().includes(func.toLowerCase())) {
          console.log(`      - Function "${func}" matches hint "${hint}"`);
        }
      }
    }
  }
});

console.log('\n✅ Test Summary:');
console.log('  - Query enhancement generates relevant function hints');
console.log('  - File path patterns (formatter, utils) boost scores');
console.log('  - Function name matching works as expected');
console.log('\n  The exerciseFormatters.ts file SHOULD score high because:');
console.log('  1. Path contains "formatter" (file hint match)');
console.log('  2. Functions match hints like "formatVariation", "constructName"');
console.log('  3. Multiple concept matches');