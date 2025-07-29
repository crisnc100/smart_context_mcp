#!/usr/bin/env node

// Test 1: Different Query Styles (Simplified)
// Tests how the system handles various ways users might phrase the same request

import { SemanticSearch } from '../src/semanticSearch.js';
import { QueryEnhancer } from '../src/queryEnhancer.js';

console.log('🧪 Test 1: Different Query Styles\n');
console.log('Testing how users might phrase authentication-related requests differently\n');

const enhancer = new QueryEnhancer();
const search = new SemanticSearch();

// Mock auth files for testing
const authFiles = {
  'authService.js': {
    path: 'src/auth/authService.js',
    functions: ['authenticateUser', 'generateAuthToken', 'validateToken'],
    imports: ['jwt'],
    exports: ['AuthService']
  },
  'loginController.js': {
    path: 'src/auth/loginController.js',
    functions: ['handleUserLogin', 'handleTokenValidation'],
    imports: ['authService'],
    exports: ['handleUserLogin', 'handleTokenValidation']
  },
  'authMiddleware.js': {
    path: 'src/auth/authMiddleware.js',
    functions: ['requireAuth', 'requireRole'],
    imports: ['authService'],
    exports: ['requireAuth', 'requireRole']
  },
  'passwordUtils.js': {
    path: 'src/utils/passwordUtils.js',
    functions: ['hashPassword', 'verifyPassword', 'validatePasswordStrength'],
    imports: ['bcrypt'],
    exports: ['hashPassword', 'verifyPassword']
  },
  'userService.js': {
    path: 'src/services/userService.js',
    functions: ['findUserByEmail', 'findUserById', 'createUser'],
    imports: ['db', 'passwordUtils'],
    exports: ['UserService']
  }
};

// Different ways to ask for authentication code
const queryVariations = [
  // Direct and technical
  { query: "user authentication login", style: "Direct technical" },
  { query: "implement user login authentication system", style: "Implementation request" },
  
  // Natural language
  { query: "how do users log in to the system", style: "Natural question" },
  { query: "where is the code that handles when someone signs in", style: "Conversational" },
  
  // Partial/vague
  { query: "auth", style: "Single word" },
  { query: "login stuff", style: "Casual/vague" },
  
  // Specific feature
  { query: "validate jwt token middleware", style: "Specific technical" },
  { query: "password hashing bcrypt", style: "Implementation detail" },
  
  // Problem-oriented
  { query: "fix authentication not working", style: "Problem statement" },
  { query: "users can't log in debug", style: "Debug request" },
  
  // Code pattern
  { query: "handleUserLogin function", style: "Function name" },
  { query: "authService.authenticateUser", style: "Method reference" },
  
  // File-oriented
  { query: "authentication middleware file", style: "File request" },
  { query: "where is loginController", style: "File location" }
];

const results = [];

for (const { query, style } of queryVariations) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📝 Style: ${style}`);
  console.log(`   Query: "${query}"`);
  console.log('='.repeat(70));
  
  // Enhance query
  const enhanced = enhancer.enhanceQuery(query);
  console.log('\n🔍 Query Enhancement:');
  console.log(`   Functions: ${enhanced.functionHints.slice(0, 5).join(', ')}${enhanced.functionHints.length > 5 ? '...' : ''}`);
  console.log(`   Files: ${enhanced.fileHints.join(', ')}`);
  console.log(`   Patterns: ${enhanced.patterns.slice(0, 5).join(', ')}`);
  
  // Analyze query
  const analysis = search.analyzeQuery(query);
  
  // Test against all files
  const fileResults = [];
  Object.values(authFiles).forEach(file => {
    const similarity = search.calculateSemanticSimilarity(analysis, file);
    if (similarity > 0) {
      fileResults.push({ 
        file: file.path, 
        score: similarity,
        basename: file.path.split('/').pop()
      });
    }
  });
  
  // Sort by score
  fileResults.sort((a, b) => b.score - a.score);
  
  // Expected auth files
  const primaryAuthFiles = ['authService.js', 'loginController.js', 'authMiddleware.js'];
  const foundPrimaryFiles = fileResults.filter(r => 
    primaryAuthFiles.includes(r.basename) && r.score > 0.3
  ).length;
  
  const result = {
    query,
    style,
    totalFound: fileResults.length,
    primaryFilesFound: foundPrimaryFiles,
    topFile: fileResults[0]?.basename || 'None',
    topScore: fileResults[0]?.score || 0,
    allResults: fileResults
  };
  
  results.push(result);
  
  console.log('\n📊 Results:');
  console.log(`   Total files matched: ${fileResults.length}/5`);
  console.log(`   Primary auth files found: ${foundPrimaryFiles}/3`);
  if (fileResults.length > 0) {
    console.log(`   Top match: ${result.topFile} (${(result.topScore * 100).toFixed(0)}%)`);
    console.log('\n   All matches:');
    fileResults.forEach((r, i) => {
      const isPrimary = primaryAuthFiles.includes(r.basename);
      console.log(`   ${i + 1}. ${r.basename} - ${(r.score * 100).toFixed(0)}% ${isPrimary ? '⭐' : ''}`);
    });
  }
}

// Summary analysis
console.log(`\n\n${'='.repeat(70)}`);
console.log('📈 QUERY STYLE TEST SUMMARY');
console.log('='.repeat(70));

// Group results by style category
const styleGroups = {
  'Technical': ['Direct technical', 'Implementation request', 'Specific technical', 'Implementation detail'],
  'Natural Language': ['Natural question', 'Conversational'],
  'Vague/Short': ['Single word', 'Casual/vague'],
  'Problem-Oriented': ['Problem statement', 'Debug request'],
  'Code Reference': ['Function name', 'Method reference'],
  'File-Oriented': ['File request', 'File location']
};

console.log('\n📊 Performance by Query Style:');
Object.entries(styleGroups).forEach(([group, styles]) => {
  const groupResults = results.filter(r => styles.includes(r.style));
  const avgPrimaryFiles = groupResults.reduce((sum, r) => sum + r.primaryFilesFound, 0) / groupResults.length;
  const avgScore = groupResults.reduce((sum, r) => sum + r.topScore, 0) / groupResults.length;
  const successRate = groupResults.filter(r => r.primaryFilesFound >= 2).length / groupResults.length;
  
  console.log(`\n${group}:`);
  console.log(`  Success rate: ${(successRate * 100).toFixed(0)}%`);
  console.log(`  Avg primary files: ${avgPrimaryFiles.toFixed(1)}/3`);
  console.log(`  Avg top score: ${(avgScore * 100).toFixed(0)}%`);
  
  console.log('  Examples:');
  groupResults.forEach(r => {
    const status = r.primaryFilesFound >= 2 ? '✅' : r.primaryFilesFound >= 1 ? '⚠️' : '❌';
    console.log(`    ${status} "${r.query}" → ${r.topFile} (${(r.topScore * 100).toFixed(0)}%)`);
  });
});

// Overall statistics
const overallSuccess = results.filter(r => r.primaryFilesFound >= 2).length;
const perfectMatches = results.filter(r => r.primaryFilesFound === 3).length;

console.log('\n📊 Overall Statistics:');
console.log(`  Total queries tested: ${results.length}`);
console.log(`  Successful (≥2 primary files): ${overallSuccess}/${results.length} (${(overallSuccess/results.length*100).toFixed(0)}%)`);
console.log(`  Perfect (3/3 primary files): ${perfectMatches}/${results.length} (${(perfectMatches/results.length*100).toFixed(0)}%)`);

// Best and worst performing queries
const sortedBySuccess = [...results].sort((a, b) => {
  if (b.primaryFilesFound !== a.primaryFilesFound) {
    return b.primaryFilesFound - a.primaryFilesFound;
  }
  return b.topScore - a.topScore;
});

console.log('\n🏆 Best Performing Queries:');
sortedBySuccess.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. "${r.query}" (${r.style})`);
  console.log(`     Found ${r.primaryFilesFound}/3 primary files, top: ${r.topFile} (${(r.topScore * 100).toFixed(0)}%)`);
});

console.log('\n⚠️  Worst Performing Queries:');
sortedBySuccess.slice(-3).reverse().forEach((r, i) => {
  console.log(`  ${i + 1}. "${r.query}" (${r.style})`);
  console.log(`     Found ${r.primaryFilesFound}/3 primary files, top: ${r.topFile} (${(r.topScore * 100).toFixed(0)}%)`);
});

console.log('\n✅ Test Complete!');