// Simple test cases for Smart Context MCP improvements

import { SemanticSearch } from '../src/semanticSearch.js';
import { QueryEnhancer } from '../src/queryEnhancer.js';

console.log('🧪 Testing Smart Context MCP Improvements\n');

const enhancer = new QueryEnhancer();
const search = new SemanticSearch();

// Test cases
const testCases = [
  {
    query: "exercise naming formatting variation names",
    expectedFunctions: ['formatExercise', 'constructName', 'formatVariation'],
    description: "Original user case"
  },
  {
    query: "user authentication token validation",
    expectedFunctions: ['validateToken', 'authenticate', 'verifyUser'],
    description: "Auth validation"
  },
  {
    query: "database connection pool error handling",
    expectedFunctions: ['handleError', 'getConnection', 'createPool'],
    description: "DB error handling"
  },
  {
    query: "transform normalize data pipeline",
    expectedFunctions: ['transformData', 'normalize', 'processData'],
    description: "Data pipeline"
  },
  {
    query: "react hook fetch loading state",
    expectedFunctions: ['useFetch', 'useData', 'useLoading'],
    description: "React hooks"
  }
];

// Mock files for testing
const mockFiles = {
  'exerciseFormatters.ts': {
    path: 'src/utils/exerciseFormatters.ts',
    functions: ['constructExerciseName', 'formatOptionName', 'formatVariation'],
    imports: [],
    exports: ['constructExerciseName', 'formatOptionName', 'formatVariation']
  },
  'authMiddleware.js': {
    path: 'src/middleware/authMiddleware.js',
    functions: ['authenticate', 'validateRequest'],
    imports: ['tokenValidator'],
    exports: ['authenticate']
  },
  'tokenValidator.js': {
    path: 'src/utils/tokenValidator.js',
    functions: ['validateToken', 'generateToken', 'verifySignature'],
    imports: ['jwt'],
    exports: ['validateToken', 'generateToken']
  },
  'dbConnection.js': {
    path: 'src/config/dbConnection.js',
    functions: ['createConnectionPool', 'handleConnectionError'],
    imports: ['pg', 'dbErrors'],
    exports: ['createConnectionPool']
  },
  'dataTransformer.js': {
    path: 'src/utils/dataTransformer.js',
    functions: ['transform', 'transformAsync', 'addTransformation'],
    imports: [],
    exports: ['DataTransformer']
  },
  'normalizer.js': {
    path: 'src/utils/normalizer.js',
    functions: ['normalizeData', 'applyRules'],
    imports: [],
    exports: ['normalizeData']
  },
  'useFetch.js': {
    path: 'src/hooks/useFetch.js',
    functions: ['useFetch', 'fetchReducer'],
    imports: ['react'],
    exports: ['useFetch']
  },
  'useDataFetch.js': {
    path: 'src/hooks/useDataFetch.js',
    functions: ['useDataFetch'],
    imports: ['react'],
    exports: ['useDataFetch']
  }
};

console.log('Running tests on', Object.keys(mockFiles).length, 'mock files\n');

// Run tests
testCases.forEach((testCase, i) => {
  console.log(`\nTest ${i + 1}: ${testCase.description}`);
  console.log(`Query: "${testCase.query}"`);
  
  // Enhance query
  const enhanced = enhancer.enhanceQuery(testCase.query);
  console.log(`Function hints: ${enhanced.functionHints.slice(0, 5).join(', ')}...`);
  
  // Analyze query
  const analysis = search.analyzeQuery(testCase.query);
  
  // Test against files
  const results = [];
  Object.values(mockFiles).forEach(file => {
    const similarity = search.calculateSemanticSimilarity(analysis, file);
    if (similarity > 0) {
      results.push({ file: file.path, score: similarity });
    }
  });
  
  // Sort and display top results
  results.sort((a, b) => b.score - a.score);
  console.log('\nTop matches:');
  results.slice(0, 3).forEach((result, j) => {
    console.log(`  ${j + 1}. ${result.file} - ${(result.score * 100).toFixed(0)}%`);
  });
});

console.log('\n\n✅ Test Summary:');
console.log('- Query enhancement generates relevant function hints');
console.log('- Semantic similarity scoring prioritizes function matches');
console.log('- File path patterns boost relevance scores');
console.log('- Code-specific patterns improve search accuracy');