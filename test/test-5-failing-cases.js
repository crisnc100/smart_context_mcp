#!/usr/bin/env node

// Test 5: Specific Failing Cases
// Tests queries that we know are challenging based on previous tests

import { SemanticSearch } from '../src/semanticSearch.js';
import { QueryEnhancer } from '../src/queryEnhancer.js';

console.log('🧪 Test 5: Specific Failing Cases\n');
console.log('Testing challenging queries identified from previous tests\n');

const enhancer = new QueryEnhancer();
const search = new SemanticSearch();

// Mock files for failing cases
const testFiles = {
  // Acronym files
  'JWT.js': {
    path: 'src/auth/JWT.js',
    functions: ['generateJWT', 'verifyJWT', 'decodeJWT'],
    content: 'JWT token generation and validation'
  },
  'API.ts': {
    path: 'src/api/API.ts',
    functions: ['callAPI', 'setupAPI', 'APIError'],
    content: 'API client implementation'
  },
  'SQLQuery.js': {
    path: 'src/db/SQLQuery.js',
    functions: ['executeSQL', 'buildSQLQuery'],
    content: 'SQL query builder'
  },
  
  // Domain-specific terms
  'coChangeAnalyzer.js': {
    path: 'src/git/coChangeAnalyzer.js',
    functions: ['analyzeCoChanges', 'getCoChangeScore'],
    content: 'Git co-change pattern analysis'
  },
  'ast-parser.js': {
    path: 'src/parser/ast-parser.js',
    functions: ['parseAST', 'traverseAST'],
    content: 'Abstract syntax tree parser'
  },
  
  // Natural language confusion
  'userLoginHandler.js': {
    path: 'src/auth/userLoginHandler.js',
    functions: ['handleLogin', 'processSignIn'],
    content: 'Handles when users sign in to the system'
  },
  'dataFetcher.js': {
    path: 'src/utils/dataFetcher.js',
    functions: ['fetchData', 'getData', 'retrieveInfo'],
    content: 'Fetches data from various sources'
  },
  
  // Vague terms
  'stuff.js': {
    path: 'src/utils/stuff.js',
    functions: ['doStuff', 'processStuff'],
    content: 'Various utility functions'
  },
  'helper.js': {
    path: 'src/utils/helper.js',
    functions: ['help', 'assist', 'support'],
    content: 'Helper utilities'
  },
  
  // Complex compound terms
  'graphQLResolverMiddleware.ts': {
    path: 'src/graphql/graphQLResolverMiddleware.ts',
    functions: ['resolveGraphQL', 'applyMiddleware'],
    content: 'GraphQL resolver middleware'
  },
  'reactHooksStateManager.jsx': {
    path: 'src/hooks/reactHooksStateManager.jsx',
    functions: ['useStateManager', 'useGlobalState'],
    content: 'React hooks for state management'
  }
};

// Challenging test cases based on failures
const failingCases = [
  // Acronym challenges
  {
    query: "JWT token generation",
    expected: ['JWT.js'],
    issue: "All-caps acronym matching"
  },
  {
    query: "jwt authentication",
    expected: ['JWT.js'],
    issue: "Case sensitivity with acronyms"
  },
  {
    query: "api client setup",
    expected: ['API.ts'],
    issue: "Mixed case acronym"
  },
  {
    query: "SQL query builder",
    expected: ['SQLQuery.js'],
    issue: "Acronym in compound name"
  },
  
  // Domain-specific terminology
  {
    query: "git co-change analysis",
    expected: ['coChangeAnalyzer.js'],
    issue: "Domain-specific term 'co-change'"
  },
  {
    query: "AST parser implementation",
    expected: ['ast-parser.js'],
    issue: "Technical acronym AST"
  },
  
  // Natural language queries
  {
    query: "where do users sign in",
    expected: ['userLoginHandler.js'],
    issue: "Natural language phrasing"
  },
  {
    query: "how to get data from API",
    expected: ['dataFetcher.js', 'API.ts'],
    issue: "Question format query"
  },
  
  // Vague/casual language
  {
    query: "login stuff",
    expected: ['userLoginHandler.js'],
    issue: "Casual term 'stuff'"
  },
  {
    query: "helper functions",
    expected: ['helper.js'],
    issue: "Generic term 'helper'"
  },
  
  // Complex technical terms
  {
    query: "graphql resolver middleware",
    expected: ['graphQLResolverMiddleware.ts'],
    issue: "Multi-technology compound"
  },
  {
    query: "react hooks state management",
    expected: ['reactHooksStateManager.jsx'],
    issue: "Framework-specific compound"
  }
];

console.log('Testing known challenging queries:\n');

const results = [];

failingCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: "${testCase.query}"`);
  console.log(`Issue: ${testCase.issue}`);
  console.log(`Expected: ${testCase.expected.join(', ')}`);
  
  // Enhance and analyze
  const enhanced = enhancer.enhanceQuery(testCase.query);
  const analysis = search.analyzeQuery(testCase.query);
  
  console.log('\n🔍 Query Processing:');
  console.log(`  Enhanced hints: ${enhanced.functionHints.slice(0, 3).join(', ')}...`);
  console.log(`  Concepts: ${analysis.concepts.slice(0, 3).join(', ')}...`);
  
  // Test against files
  const matches = [];
  Object.entries(testFiles).forEach(([filename, fileData]) => {
    const mockFile = {
      path: fileData.path,
      functions: fileData.functions,
      imports: [],
      exports: fileData.functions
    };
    
    const similarity = search.calculateSemanticSimilarity(analysis, mockFile);
    if (similarity > 0) {
      matches.push({
        filename,
        score: similarity,
        path: fileData.path
      });
    }
  });
  
  // Sort by score
  matches.sort((a, b) => b.score - a.score);
  
  // Check results
  const foundExpected = testCase.expected.filter(expected =>
    matches.some(m => m.filename === expected && m.score > 0.15)
  );
  
  const result = {
    query: testCase.query,
    issue: testCase.issue,
    expectedCount: testCase.expected.length,
    foundCount: foundExpected.length,
    topMatch: matches[0],
    success: foundExpected.length === testCase.expected.length,
    matches
  };
  
  results.push(result);
  
  console.log('\n📊 Results:');
  console.log(`  Expected files found: ${foundExpected.length}/${testCase.expected.length}`);
  if (matches.length > 0) {
    console.log(`  Top match: ${matches[0].filename} (${(matches[0].score * 100).toFixed(0)}%)`);
    if (matches.length > 1) {
      console.log('\n  Other matches:');
      matches.slice(1, 4).forEach((m, i) => {
        const isExpected = testCase.expected.includes(m.filename);
        console.log(`  ${i + 2}. ${m.filename} (${(m.score * 100).toFixed(0)}%) ${isExpected ? '✓' : ''}`);
      });
    }
  } else {
    console.log('  No matches found!');
  }
  
  console.log(`\n  Status: ${result.success ? '✅ FIXED' : '❌ STILL FAILING'}`);
});

// Summary
console.log('\n\n' + '='.repeat(70));
console.log('📈 FAILING CASES TEST SUMMARY');
console.log('='.repeat(70));

const fixedCount = results.filter(r => r.success).length;
console.log(`\nOverall: ${fixedCount}/${results.length} previously failing cases now fixed (${(fixedCount/results.length*100).toFixed(0)}%)\n`);

// Group by issue type
const issueGroups = {
  'Acronyms': results.filter(r => r.issue.includes('acronym') || r.issue.includes('caps')),
  'Natural Language': results.filter(r => r.issue.includes('Natural') || r.issue.includes('Question')),
  'Domain Terms': results.filter(r => r.issue.includes('Domain') || r.issue.includes('Technical')),
  'Vague Language': results.filter(r => r.issue.includes('Casual') || r.issue.includes('Generic')),
  'Complex Terms': results.filter(r => r.issue.includes('compound') || r.issue.includes('Framework'))
};

console.log('📊 Results by Issue Type:');
Object.entries(issueGroups).forEach(([group, groupResults]) => {
  const fixed = groupResults.filter(r => r.success).length;
  const percentage = groupResults.length > 0 ? (fixed/groupResults.length*100).toFixed(0) : 0;
  console.log(`\n${group}: ${fixed}/${groupResults.length} fixed (${percentage}%)`);
  
  groupResults.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const score = r.topMatch ? `${(r.topMatch.score * 100).toFixed(0)}%` : 'No match';
    console.log(`  ${status} "${r.query}" → ${score}`);
  });
});

// Improvements achieved
const improvements = results.filter(r => r.topMatch && r.topMatch.score > 0.5);
console.log('\n🎯 Improvements Achieved:');
console.log(`  High-score matches (>50%): ${improvements.length}/${results.length}`);
console.log(`  Average top score: ${(results.reduce((sum, r) => sum + (r.topMatch?.score || 0), 0) / results.length * 100).toFixed(0)}%`);

// Still challenging
const stillFailing = results.filter(r => !r.success);
console.log('\n⚠️  Still Challenging:');
stillFailing.slice(0, 5).forEach(r => {
  console.log(`  "${r.query}" - ${r.issue}`);
});

console.log('\n💡 Recommendations for Remaining Issues:');
console.log('1. Acronym Dictionary: Map common acronyms (JWT, API, SQL, AST)');
console.log('2. Natural Language Processing: Better "where/how" question handling');
console.log('3. Domain Vocabulary: Technical term synonyms (co-change, AST, etc.)');
console.log('4. Compound Term Parsing: Split "graphQLResolverMiddleware" into parts');
console.log('5. Context Awareness: Understand "stuff" from surrounding context');

console.log('\n✅ Failing Cases Test Complete!');