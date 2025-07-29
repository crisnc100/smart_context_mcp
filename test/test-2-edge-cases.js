#!/usr/bin/env node

// Test 2: Edge Cases
// Tests unusual file names, deeply nested files, special characters, etc.

import { SemanticSearch } from '../src/semanticSearch.js';
import { QueryEnhancer } from '../src/queryEnhancer.js';
import { FileScanner } from '../src/fileScanner.js';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Test 2: Edge Cases\n');
console.log('Testing unusual file names, deep nesting, special characters\n');

const enhancer = new QueryEnhancer();
const search = new SemanticSearch();

// Create edge case files
function createEdgeCaseProject() {
  const testDir = path.join(__dirname, 'test-edge-cases-project');
  
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  
  mkdirSync(testDir, { recursive: true });
  
  // Create various edge case directories
  const dirs = [
    'src/deeply/nested/folder/structure/here',
    'src/kebab-case-folder',
    'src/snake_case_folder',
    'src/camelCaseFolder',
    'src/PascalCaseFolder',
    'src/folder with spaces',
    'src/special-chars-#@!',
    'src/numbers123/456test',
    'src/.hidden-folder',
    'src/__tests__',
    'src/[brackets]',
    'src/(parentheses)'
  ];
  
  dirs.forEach(dir => {
    try {
      mkdirSync(path.join(testDir, dir), { recursive: true });
    } catch (e) {
      // Some chars might fail on certain OS
    }
  });
  
  return testDir;
}

// Edge case test files
const edgeCaseFiles = {
  // Unusual naming conventions
  'user-auth-service.js': {
    path: 'src/kebab-case-folder/user-auth-service.js',
    functions: ['authenticateUser', 'validateToken'],
    description: 'Kebab-case file and folder'
  },
  'user_auth_service.py': {
    path: 'src/snake_case_folder/user_auth_service.py',
    functions: ['authenticate_user', 'validate_token'],
    description: 'Snake_case file and folder'
  },
  'UserAuthService.cs': {
    path: 'src/PascalCaseFolder/UserAuthService.cs',
    functions: ['AuthenticateUser', 'ValidateToken'],
    description: 'PascalCase file and folder'
  },
  'userAuthService.java': {
    path: 'src/camelCaseFolder/userAuthService.java',
    functions: ['authenticateUser', 'validateToken'],
    description: 'camelCase file and folder'
  },
  
  // Deep nesting
  'auth.js': {
    path: 'src/deeply/nested/folder/structure/here/auth.js',
    functions: ['authenticate'],
    description: 'Deeply nested file (6 levels)'
  },
  
  // Special characters and spaces
  'auth service.js': {
    path: 'src/folder with spaces/auth service.js',
    functions: ['authenticate'],
    description: 'Spaces in path and filename'
  },
  'auth#service.js': {
    path: 'src/special-chars-#@!/auth#service.js',
    functions: ['authenticate'],
    description: 'Special characters in path'
  },
  
  // Numbers and mixed
  '123auth.js': {
    path: 'src/numbers123/456test/123auth.js',
    functions: ['authenticate'],
    description: 'Numbers in path and filename'
  },
  
  // Hidden and special folders
  '.auth-config.js': {
    path: 'src/.hidden-folder/.auth-config.js',
    functions: ['loadConfig'],
    description: 'Hidden folder and file'
  },
  'auth.test.js': {
    path: 'src/__tests__/auth.test.js',
    functions: ['testAuthentication'],
    description: 'Test file in __tests__ folder'
  },
  
  // Very long names
  'thisIsAVeryLongFileNameThatTestsHowTheSystemHandlesExtremelyLongFileNamesInPractice.js': {
    path: 'src/thisIsAVeryLongFileNameThatTestsHowTheSystemHandlesExtremelyLongFileNamesInPractice.js',
    functions: ['veryLongFunctionNameThatIsHardToType'],
    description: 'Extremely long filename'
  },
  
  // Unicode and international
  'ユーザー認証.js': {
    path: 'src/ユーザー認証.js',
    functions: ['認証する'],
    description: 'Japanese characters'
  },
  'auth_façade.js': {
    path: 'src/auth_façade.js',
    functions: ['authenticate'],
    description: 'Accented characters'
  },
  
  // Acronyms and abbreviations
  'JWT.js': {
    path: 'src/JWT.js',
    functions: ['generateJWT', 'verifyJWT'],
    description: 'All caps acronym'
  },
  'authSvc.js': {
    path: 'src/authSvc.js',
    functions: ['auth', 'deauth'],
    description: 'Abbreviated names'
  }
};

// Test queries for edge cases
const edgeCaseQueries = [
  // Naming convention queries
  { query: "user auth service", expected: ['user-auth-service.js', 'user_auth_service.py', 'UserAuthService.cs'] },
  { query: "authenticate user kebab case", expected: ['user-auth-service.js'] },
  { query: "authenticate_user snake", expected: ['user_auth_service.py'] },
  { query: "AuthenticateUser Pascal", expected: ['UserAuthService.cs'] },
  
  // Deep nesting
  { query: "deeply nested auth", expected: ['auth.js'] },
  { query: "auth in nested folder", expected: ['auth.js'] },
  
  // Special characters
  { query: "auth service with spaces", expected: ['auth service.js'] },
  { query: "hidden auth config", expected: ['.auth-config.js'] },
  
  // Numbers and mixed
  { query: "123 auth", expected: ['123auth.js'] },
  { query: "auth test file", expected: ['auth.test.js'] },
  
  // Long names
  { query: "very long file name", expected: ['thisIsAVeryLongFileNameThatTestsHowTheSystemHandlesExtremelyLongFileNamesInPractice.js'] },
  
  // Acronyms
  { query: "JWT token", expected: ['JWT.js'] },
  { query: "auth service abbreviated", expected: ['authSvc.js'] },
  
  // Case sensitivity
  { query: "jwt", expected: ['JWT.js'] },
  { query: "JWT", expected: ['JWT.js'] },
  { query: "Jwt", expected: ['JWT.js'] }
];

// Simplified mock testing
console.log('📊 Testing Edge Case Handling:\n');

const results = [];

edgeCaseQueries.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: "${testCase.query}"`);
  console.log(`Expected: ${testCase.expected.join(', ')}`);
  
  // Enhance and analyze query
  const enhanced = enhancer.enhanceQuery(testCase.query);
  const analysis = search.analyzeQuery(testCase.query);
  
  // Test against mock files
  const matches = [];
  Object.entries(edgeCaseFiles).forEach(([filename, fileData]) => {
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
        description: fileData.description 
      });
    }
  });
  
  // Sort by score
  matches.sort((a, b) => b.score - a.score);
  
  // Calculate success
  const foundExpected = testCase.expected.filter(expected => 
    matches.some(m => m.filename === expected && m.score > 0.15)
  );
  
  const result = {
    query: testCase.query,
    expected: testCase.expected.length,
    found: foundExpected.length,
    success: foundExpected.length === testCase.expected.length,
    topMatch: matches[0]
  };
  
  results.push(result);
  
  console.log(`\nResults:`);
  console.log(`  Found ${foundExpected.length}/${testCase.expected.length} expected files`);
  if (matches.length > 0) {
    console.log(`  Top match: ${matches[0].filename} (${(matches[0].score * 100).toFixed(0)}%)`);
    console.log(`  Description: ${matches[0].description}`);
    
    if (matches.length > 1) {
      console.log('\n  Other matches:');
      matches.slice(1, 4).forEach((m, i) => {
        const isExpected = testCase.expected.includes(m.filename);
        console.log(`  ${i + 2}. ${m.filename} (${(m.score * 100).toFixed(0)}%) ${isExpected ? '✓' : ''}`);
      });
    }
  }
  
  console.log(`\n  Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
});

// Summary
console.log('\n\n' + '='.repeat(70));
console.log('📈 EDGE CASE TEST SUMMARY');
console.log('='.repeat(70));

const successCount = results.filter(r => r.success).length;
console.log(`\nOverall: ${successCount}/${results.length} tests passed (${(successCount/results.length*100).toFixed(0)}%)\n`);

// Group by type
const edgeCaseTypes = {
  'Naming Conventions': results.slice(0, 4),
  'Deep Nesting': results.slice(4, 6),
  'Special Characters': results.slice(6, 8),
  'Numbers & Mixed': results.slice(8, 10),
  'Long Names': results.slice(10, 11),
  'Acronyms': results.slice(11, 13),
  'Case Sensitivity': results.slice(13, 16)
};

Object.entries(edgeCaseTypes).forEach(([type, typeResults]) => {
  const passed = typeResults.filter(r => r.success).length;
  console.log(`\n${type}:`);
  console.log(`  Passed: ${passed}/${typeResults.length}`);
  typeResults.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} "${r.query}" - Found ${r.found}/${r.expected}`);
  });
});

// Key findings
console.log('\n🔍 Key Findings:');
console.log('1. Naming convention handling (kebab-case, snake_case, etc.)');
console.log('2. Deep nesting support');
console.log('3. Special character tolerance');
console.log('4. Case sensitivity handling');
console.log('5. Long filename support');

console.log('\n✅ Edge Case Test Complete!');