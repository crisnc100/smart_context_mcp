#!/usr/bin/env node

// Test 1: Different Query Styles
// Tests how the system handles various ways users might phrase the same request

import { SemanticSearch } from '../src/semanticSearch.js';
import { QueryEnhancer } from '../src/queryEnhancer.js';
import { FileScanner } from '../src/fileScanner.js';
import { ContextAnalyzer } from '../src/contextAnalyzer-pure.js';
import { initDatabase } from '../src/database-sqljs.js';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test project
function createTestProject() {
  const testDir = path.join(__dirname, 'test-query-styles-project');
  
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  
  mkdirSync(testDir, { recursive: true });
  mkdirSync(path.join(testDir, 'src/auth'), { recursive: true });
  mkdirSync(path.join(testDir, 'src/utils'), { recursive: true });
  mkdirSync(path.join(testDir, 'src/services'), { recursive: true });
  
  // Create auth-related files
  const files = {
    'src/auth/authService.js': `
export class AuthService {
  async authenticateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) throw new Error('User not found');
    
    const isValid = await this.verifyPassword(password, user.hashedPassword);
    if (!isValid) throw new Error('Invalid password');
    
    return this.generateAuthToken(user);
  }
  
  generateAuthToken(user) {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  }
  
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await this.findUserById(decoded.userId);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}`,
    'src/auth/loginController.js': `
import { AuthService } from './authService.js';

export async function handleUserLogin(req, res) {
  try {
    const { email, password } = req.body;
    const authService = new AuthService();
    
    const result = await authService.authenticateUser(email, password);
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
}

export async function handleTokenValidation(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const user = await authService.validateToken(token);
    res.json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
}`,
    'src/utils/passwordUtils.js': `
import bcrypt from 'bcrypt';

export async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  
  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
    strength: calculateStrength(password)
  };
}`,
    'src/services/userService.js': `
export class UserService {
  async findUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }
  
  async findUserById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
  
  async createUser(userData) {
    const { email, password, name } = userData;
    const hashedPassword = await hashPassword(password);
    
    const query = 'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *';
    const result = await db.query(query, [email, hashedPassword, name]);
    return result.rows[0];
  }
}`,
    'src/auth/authMiddleware.js': `
import { AuthService } from './authService.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const authService = new AuthService();
    const user = await authService.validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}`
  };
  
  // Write files
  Object.entries(files).forEach(([filePath, content]) => {
    writeFileSync(path.join(testDir, filePath), content);
  });
  
  return testDir;
}

async function runTest() {
  console.log('🧪 Test 1: Different Query Styles\n');
  console.log('Testing how users might phrase authentication-related requests differently\n');
  
  // Initialize
  await initDatabase();
  const testDir = createTestProject();
  
  const scanner = new FileScanner(testDir);
  const analyzer = new ContextAnalyzer(testDir);
  const semanticSearch = new SemanticSearch();
  const queryEnhancer = new QueryEnhancer();
  
  // Scan files
  const files = scanner.scanCodebase();
  console.log(`📁 Created test project with ${files.length} files\n`);
  
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
    const enhanced = queryEnhancer.enhanceQuery(query);
    console.log('\n🔍 Enhanced:');
    console.log(`   Functions: ${enhanced.functionHints.slice(0, 5).join(', ')}${enhanced.functionHints.length > 5 ? '...' : ''}`);
    console.log(`   Files: ${enhanced.fileHints.join(', ')}`);
    
    // Get context
    const context = await analyzer.getOptimalContext({
      task: query,
      projectFiles: files,
      targetTokens: 8000,
      minRelevanceScore: 0.15
    });
    
    // Expected files for auth queries
    const authFiles = ['authService.js', 'loginController.js', 'authMiddleware.js'];
    const foundAuthFiles = context.included.filter(f => 
      authFiles.some(af => f.path.includes(af))
    ).length;
    
    const result = {
      query,
      style,
      totalFound: context.included.length,
      authFilesFound: foundAuthFiles,
      topFile: context.included[0]?.path || 'None',
      topScore: context.included[0]?.score || 0
    };
    
    results.push(result);
    
    console.log('\n📊 Results:');
    console.log(`   Total files found: ${context.included.length}`);
    console.log(`   Auth files found: ${foundAuthFiles}/3`);
    console.log(`   Top match: ${path.basename(result.topFile)} (${(result.topScore * 100).toFixed(0)}%)`);
    
    if (context.included.length > 0) {
      console.log('\n   All matches:');
      context.included.forEach((file, i) => {
        const isAuthFile = authFiles.some(af => file.path.includes(af));
        console.log(`   ${i + 1}. ${path.basename(file.path)} (${(file.score * 100).toFixed(0)}%) ${isAuthFile ? '✅' : ''}`);
      });
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📈 QUERY STYLE TEST SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\nSuccess by query style:');
  const styleGroups = {
    'Technical': ['Direct technical', 'Implementation request', 'Specific technical', 'Implementation detail'],
    'Natural': ['Natural question', 'Conversational'],
    'Vague': ['Single word', 'Casual/vague'],
    'Problem': ['Problem statement', 'Debug request'],
    'Code': ['Function name', 'Method reference'],
    'File': ['File request', 'File location']
  };
  
  Object.entries(styleGroups).forEach(([group, styles]) => {
    const groupResults = results.filter(r => styles.includes(r.style));
    const avgAuthFiles = groupResults.reduce((sum, r) => sum + r.authFilesFound, 0) / groupResults.length;
    const avgScore = groupResults.reduce((sum, r) => sum + r.topScore, 0) / groupResults.length;
    
    console.log(`\n${group} queries:`);
    console.log(`  Average auth files found: ${avgAuthFiles.toFixed(1)}/3`);
    console.log(`  Average top score: ${(avgScore * 100).toFixed(0)}%`);
    groupResults.forEach(r => {
      const success = r.authFilesFound >= 2 ? '✅' : r.authFilesFound >= 1 ? '⚠️' : '❌';
      console.log(`  ${success} "${r.query}" → ${r.authFilesFound}/3 auth files`);
    });
  });
  
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
  
  return results;
}

// Run the test
runTest().catch(console.error);