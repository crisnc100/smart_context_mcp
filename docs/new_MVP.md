# Enhanced Smart Context Pruning MCP Server - MVP with LLM Feedback

## Overview

This enhanced MVP incorporates feedback from multiple LLMs to create a context pruning server that truly understands developer intent, provides transparency, and learns from actual usage patterns.

## Key Enhancements Based on LLM Feedback

1. **Semantic Understanding** - Not just keyword matching
2. **Task-Specific Modes** - Different strategies for debug/feature/refactor
3. **Transparency** - Clear reasoning for every file included
4. **Progressive Context** - Start narrow, expand intelligently
5. **Conversation Awareness** - Track what's already been examined

## Project Structure

```
smart-context-pruning/
├── package.json
├── src/
│   ├── index.js              # MCP server entry point
│   ├── database.js           # SQLite setup and queries
│   ├── contextAnalyzer.js    # Enhanced pruning logic
│   ├── fileScanner.js        # Codebase analysis
│   ├── learning.js           # ML/scoring algorithms
│   ├── semanticSearch.js     # NEW: Semantic understanding
│   ├── conversationTracker.js # NEW: Track session context
│   ├── gitAnalyzer.js        # NEW: Git history analysis
│   └── utils.js              # Helper functions
├── data/
│   └── context.db            # SQLite database
├── config/
│   └── default.json          # Configuration
└── test/
    └── test-client.js        # Test the MCP server
```

## Step 1: Enhanced Project Setup

### 1.1 Install additional dependencies

```bash
npm install @modelcontextprotocol/sdk sqlite3 better-sqlite3 
npm install tiktoken fs-extra glob ignore
npm install simple-git natural stopword # NEW: Git and NLP support
npm install vectordb # NEW: For semantic search
npm install --save-dev nodemon
```

### 1.2 Updated package.json

```json
{
  "name": "smart-context-pruning",
  "version": "1.0.0",
  "description": "Intelligent MCP server for context selection with LLM feedback integration",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "type": "module"
}
```

## Step 2: Enhanced Database Schema

### 2.1 Create `src/database.js` with additional tables

```javascript
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

mkdirSync('./data', { recursive: true });
const db = new Database('./data/context.db');

export function initDatabase() {
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  
  // Original tables (enhanced)
  db.exec(`
    CREATE TABLE IF NOT EXISTS context_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT, -- NEW: Track conversations
      task_type TEXT NOT NULL,
      task_mode TEXT, -- NEW: 'debug', 'feature', 'refactor'
      task_description TEXT,
      included_files TEXT NOT NULL,
      excluded_files TEXT,
      confidence_scores TEXT, -- NEW: JSON of confidence scores
      outcome_success BOOLEAN DEFAULT 0,
      files_actually_used TEXT, -- NEW: Track which files were helpful
      model_used TEXT,
      total_tokens INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Enhanced file relevance with task modes
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_relevance (
      file_path TEXT NOT NULL,
      task_type TEXT NOT NULL,
      task_mode TEXT NOT NULL, -- NEW: Specific mode
      relevance_score REAL DEFAULT 0.5,
      confidence REAL DEFAULT 0.5, -- NEW: Confidence in score
      success_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (file_path, task_type, task_mode)
    )
  `);

  // NEW: Semantic embeddings for files
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_embeddings (
      file_path TEXT PRIMARY KEY,
      embedding BLOB, -- Store vector embeddings
      summary TEXT, -- File purpose summary
      key_concepts TEXT, -- JSON array of concepts
      last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // NEW: Conversation context tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_context (
      conversation_id TEXT PRIMARY KEY,
      files_viewed TEXT, -- JSON array
      current_task TEXT,
      task_progress TEXT, -- JSON object tracking progress
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Enhanced file relationships
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_relationships (
      file_a TEXT NOT NULL,
      file_b TEXT NOT NULL,
      co_occurrence_count INTEGER DEFAULT 0,
      relationship_type TEXT,
      relationship_reason TEXT, -- NEW: Why they're related
      strength REAL DEFAULT 0.0,
      git_co_change_count INTEGER DEFAULT 0, -- NEW: Git analysis
      PRIMARY KEY (file_a, file_b)
    )
  `);

  // NEW: Task mode patterns
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_mode_patterns (
      task_mode TEXT PRIMARY KEY,
      file_patterns TEXT, -- JSON: patterns specific to mode
      priority_signals TEXT, -- JSON: what to prioritize
      common_keywords TEXT, -- JSON: keywords for this mode
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize default task mode patterns
  initializeTaskModePatterns();
}

function initializeTaskModePatterns() {
  const patterns = [
    {
      mode: 'debug',
      patterns: JSON.stringify({
        prioritize: ['test files', 'error handlers', 'logs', 'recent changes'],
        deprioritize: ['documentation', 'config', 'build files']
      }),
      signals: JSON.stringify({
        'recent_changes': 0.3,
        'error_handling': 0.25,
        'test_coverage': 0.2,
        'log_statements': 0.15,
        'stack_trace_match': 0.1
      }),
      keywords: JSON.stringify(['error', 'bug', 'fix', 'issue', 'fail', 'crash', 'exception'])
    },
    {
      mode: 'feature',
      patterns: JSON.stringify({
        prioritize: ['interfaces', 'similar features', 'types', 'models'],
        deprioritize: ['tests', 'old implementations', 'deprecated']
      }),
      signals: JSON.stringify({
        'similar_features': 0.3,
        'interface_definitions': 0.25,
        'type_definitions': 0.2,
        'api_contracts': 0.15,
        'ui_components': 0.1
      }),
      keywords: JSON.stringify(['add', 'create', 'implement', 'new', 'feature', 'build'])
    },
    {
      mode: 'refactor',
      patterns: JSON.stringify({
        prioritize: ['all usages', 'tests', 'dependencies', 'interfaces'],
        deprioritize: ['documentation', 'examples']
      }),
      signals: JSON.stringify({
        'usage_count': 0.3,
        'dependency_depth': 0.25,
        'test_coverage': 0.2,
        'complexity': 0.15,
        'change_risk': 0.1
      }),
      keywords: JSON.stringify(['refactor', 'clean', 'improve', 'optimize', 'restructure', 'rename'])
    }
  ];

  const insert = db.prepare(`
    INSERT OR REPLACE INTO task_mode_patterns 
    (task_mode, file_patterns, priority_signals, common_keywords) 
    VALUES (?, ?, ?, ?)
  `);

  patterns.forEach(p => insert.run(p.mode, p.patterns, p.signals, p.keywords));
}

export { db };
```

## Step 3: Semantic Search Module

### 3.1 Create `src/semanticSearch.js`

```javascript
import natural from 'natural';
import stopword from 'stopword';
import { db } from './database.js';

export class SemanticSearch {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.tfidf = new natural.TfIdf();
  }

  // Extract semantic meaning from query
  analyzeQuery(query) {
    // Tokenize and clean
    let tokens = this.tokenizer.tokenize(query.toLowerCase());
    tokens = stopword.removeStopwords(tokens);
    
    // Stem words for better matching
    const stemmed = tokens.map(token => this.stemmer.stem(token));
    
    // Extract concepts
    const concepts = this.extractConcepts(query);
    
    // Detect intent
    const intent = this.detectIntent(query);
    
    return {
      original: query,
      tokens,
      stemmed,
      concepts,
      intent,
      entities: this.extractEntities(query)
    };
  }

  extractConcepts(query) {
    const concepts = [];
    
    // Common programming concepts
    const conceptPatterns = {
      'authentication': /auth|login|signin|session|jwt|token/i,
      'database': /database|db|sql|query|migration|schema/i,
      'api': /api|endpoint|route|rest|graphql|request/i,
      'ui': /ui|component|view|screen|render|display/i,
      'state': /state|store|redux|context|provider/i,
      'error': /error|exception|fail|crash|bug|issue/i,
      'performance': /performance|optimize|slow|speed|cache/i,
      'testing': /test|spec|mock|assert|expect/i
    };

    for (const [concept, pattern] of Object.entries(conceptPatterns)) {
      if (pattern.test(query)) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  detectIntent(query) {
    const intents = {
      'understand': /how|what|where|explain|understand/i,
      'implement': /add|create|implement|build|make/i,
      'fix': /fix|debug|solve|repair|issue/i,
      'modify': /change|update|modify|edit|refactor/i,
      'optimize': /optimize|improve|enhance|speed up/i,
      'test': /test|verify|check|validate/i
    };

    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(query)) {
        return intent;
      }
    }

    return 'general';
  }

  extractEntities(query) {
    const entities = {
      functions: [],
      files: [],
      variables: [],
      errors: []
    };

    // Extract function names (camelCase or snake_case)
    const functionPattern = /\b[a-z][a-zA-Z0-9]*(?:_[a-zA-Z0-9]+)*\s*\(/g;
    const functions = query.match(functionPattern) || [];
    entities.functions = functions.map(f => f.replace('(', '').trim());

    // Extract file paths
    const filePattern = /[\w\-./]+\.(js|jsx|ts|tsx|py|java|go|rs|cpp|c|h)/g;
    entities.files = query.match(filePattern) || [];

    // Extract error messages
    const errorPattern = /(?:error|exception):\s*([^.!?]+)/i;
    const errorMatch = query.match(errorPattern);
    if (errorMatch) {
      entities.errors.push(errorMatch[1].trim());
    }

    return entities;
  }

  // Calculate semantic similarity between query and file
  calculateSemanticSimilarity(queryAnalysis, fileData) {
    const fileContent = JSON.stringify(fileData).toLowerCase();
    let similarity = 0;

    // Concept matching
    for (const concept of queryAnalysis.concepts) {
      if (fileContent.includes(concept)) {
        similarity += 0.2;
      }
    }

    // Token matching with stemming
    for (const stem of queryAnalysis.stemmed) {
      if (fileContent.includes(stem)) {
        similarity += 0.1;
      }
    }

    // Entity matching (higher weight)
    for (const func of queryAnalysis.entities.functions) {
      if (fileData.functions && fileData.functions.includes(func)) {
        similarity += 0.3;
      }
    }

    // File path matching
    for (const file of queryAnalysis.entities.files) {
      if (fileData.path.includes(file)) {
        similarity += 0.5;
      }
    }

    return Math.min(similarity, 1.0);
  }

  // Find semantically similar files
  async findSimilarFiles(queryAnalysis, projectFiles, limit = 10) {
    const scores = [];

    for (const file of projectFiles) {
      const similarity = this.calculateSemanticSimilarity(queryAnalysis, file);
      if (similarity > 0) {
        scores.push({
          file: file.path,
          similarity,
          matchedConcepts: queryAnalysis.concepts.filter(c => 
            JSON.stringify(file).toLowerCase().includes(c)
          )
        });
      }
    }

    return scores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}
```

## Step 4: Conversation Tracker

### 4.1 Create `src/conversationTracker.js`

```javascript
import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

export class ConversationTracker {
  constructor() {
    this.activeConversations = new Map();
  }

  // Start or get conversation
  getOrCreateConversation(conversationId) {
    if (!conversationId) {
      conversationId = uuidv4();
    }

    if (!this.activeConversations.has(conversationId)) {
      // Load from DB or create new
      const existing = db.prepare(
        'SELECT * FROM conversation_context WHERE conversation_id = ?'
      ).get(conversationId);

      if (existing) {
        this.activeConversations.set(conversationId, {
          id: conversationId,
          filesViewed: JSON.parse(existing.files_viewed || '[]'),
          currentTask: existing.current_task,
          taskProgress: JSON.parse(existing.task_progress || '{}'),
          createdAt: existing.created_at
        });
      } else {
        const newConversation = {
          id: conversationId,
          filesViewed: [],
          currentTask: null,
          taskProgress: {},
          createdAt: new Date().toISOString()
        };
        
        this.activeConversations.set(conversationId, newConversation);
        this.saveConversation(newConversation);
      }
    }

    return this.activeConversations.get(conversationId);
  }

  // Track file as viewed
  markFileViewed(conversationId, filePath) {
    const conversation = this.getOrCreateConversation(conversationId);
    
    if (!conversation.filesViewed.includes(filePath)) {
      conversation.filesViewed.push(filePath);
      this.saveConversation(conversation);
    }
  }

  // Get files already viewed in conversation
  getViewedFiles(conversationId) {
    const conversation = this.getOrCreateConversation(conversationId);
    return conversation.filesViewed;
  }

  // Update task progress
  updateTaskProgress(conversationId, progress) {
    const conversation = this.getOrCreateConversation(conversationId);
    conversation.taskProgress = { ...conversation.taskProgress, ...progress };
    this.saveConversation(conversation);
  }

  // Check if file was already suggested
  wasFileSuggested(conversationId, filePath) {
    const conversation = this.getOrCreateConversation(conversationId);
    return conversation.filesViewed.includes(filePath);
  }

  // Get conversation context for relevance scoring
  getConversationContext(conversationId) {
    const conversation = this.getOrCreateConversation(conversationId);
    
    return {
      filesViewed: conversation.filesViewed,
      currentTask: conversation.currentTask,
      taskProgress: conversation.taskProgress,
      duration: Date.now() - new Date(conversation.createdAt).getTime()
    };
  }

  // Save conversation to database
  saveConversation(conversation) {
    db.prepare(`
      INSERT OR REPLACE INTO conversation_context 
      (conversation_id, files_viewed, current_task, task_progress, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      conversation.id,
      JSON.stringify(conversation.filesViewed),
      conversation.currentTask,
      JSON.stringify(conversation.taskProgress)
    );
  }

  // Clean up old conversations (run periodically)
  cleanupOldConversations() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    db.prepare(
      'DELETE FROM conversation_context WHERE updated_at < ?'
    ).run(oneDayAgo);

    // Remove from memory
    for (const [id, conversation] of this.activeConversations) {
      if (new Date(conversation.createdAt) < new Date(oneDayAgo)) {
        this.activeConversations.delete(id);
      }
    }
  }
}
```

## Step 5: Git Analyzer

### 5.1 Create `src/gitAnalyzer.js`

```javascript
import simpleGit from 'simple-git';
import { db } from './database.js';

export class GitAnalyzer {
  constructor(repoPath) {
    this.git = simpleGit(repoPath);
    this.repoPath = repoPath;
  }

  // Get files that frequently change together
  async analyzeCoChanges(limit = 100) {
    try {
      // Get recent commits
      const log = await this.git.log(['--oneline', '-n', limit.toString()]);
      const coChanges = new Map();

      // Analyze each commit
      for (const commit of log.all) {
        const diff = await this.git.diff(['--name-only', `${commit.hash}^`, commit.hash]);
        const files = diff.split('\n').filter(f => f.trim());

        // Track co-changes
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const key = [files[i], files[j]].sort().join('|');
            coChanges.set(key, (coChanges.get(key) || 0) + 1);
          }
        }
      }

      // Update database
      for (const [key, count] of coChanges) {
        const [fileA, fileB] = key.split('|');
        this.updateCoChangeCount(fileA, fileB, count);
      }

      return coChanges;
    } catch (error) {
      console.error('Git analysis error:', error);
      return new Map();
    }
  }

  // Get recently modified files (useful for debugging)
  async getRecentlyModifiedFiles(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const log = await this.git.log(['--since', since, '--name-only', '--pretty=format:']);
      
      const files = log.split('\n')
        .filter(f => f.trim() && !f.includes('commit'))
        .reduce((acc, file) => {
          acc[file] = (acc[file] || 0) + 1;
          return acc;
        }, {});

      return Object.entries(files)
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, modificationCount: count }));
    } catch (error) {
      console.error('Git recent files error:', error);
      return [];
    }
  }

  // Get file authors (useful for finding domain experts)
  async getFileAuthors(filePath) {
    try {
      const blame = await this.git.raw(['blame', '--line-porcelain', filePath]);
      const authors = new Map();

      const lines = blame.split('\n');
      for (const line of lines) {
        if (line.startsWith('author ')) {
          const author = line.replace('author ', '').trim();
          authors.set(author, (authors.get(author) || 0) + 1);
        }
      }

      return Array.from(authors.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([author, lines]) => ({ author, lines }));
    } catch (error) {
      return [];
    }
  }

  // Update co-change count in database
  updateCoChangeCount(fileA, fileB, count) {
    const existing = db.prepare(`
      SELECT * FROM file_relationships 
      WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
    `).get(fileA, fileB, fileB, fileA);

    if (existing) {
      db.prepare(`
        UPDATE file_relationships 
        SET git_co_change_count = ?,
            strength = strength + ?
        WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
      `).run(count, count * 0.01, fileA, fileB, fileB, fileA);
    } else {
      db.prepare(`
        INSERT INTO file_relationships 
        (file_a, file_b, git_co_change_count, relationship_type, strength)
        VALUES (?, ?, ?, 'git-co-change', ?)
      `).run(fileA, fileB, count, count * 0.1);
    }
  }

  // Check if file has recent changes (for debugging tasks)
  async hasRecentChanges(filePath, hours = 48) {
    const recentFiles = await this.getRecentlyModifiedFiles(hours);
    return recentFiles.some(f => f.file === filePath);
  }
}
```

## Step 6: Enhanced Context Analyzer

### 6.1 Update `src/contextAnalyzer.js`

```javascript
import { db } from './database.js';
import { encoding_for_model } from 'tiktoken';
import { readFileSync } from 'fs';
import path from 'path';
import { SemanticSearch } from './semanticSearch.js';
import { ConversationTracker } from './conversationTracker.js';
import { GitAnalyzer } from './gitAnalyzer.js';

export class ContextAnalyzer {
  constructor(projectRoot) {
    this.tokenizer = encoding_for_model('gpt-3.5-turbo');
    this.semanticSearch = new SemanticSearch();
    this.conversationTracker = new ConversationTracker();
    this.gitAnalyzer = new GitAnalyzer(projectRoot);
    this.projectRoot = projectRoot;
    this.lastSessionId = null;
  }

  async getOptimalContext(params) {
    const {
      task,
      currentFile,
      targetTokens = 6000,
      model = 'claude-3-opus',
      projectFiles = [],
      conversationId = null,
      progressiveLevel = 1 // NEW: 1=immediate, 2=expanded, 3=comprehensive
    } = params;

    // Analyze the query semantically
    const queryAnalysis = this.semanticSearch.analyzeQuery(task);
    
    // Classify task type and mode
    const taskType = this.classifyTask(task);
    const taskMode = this.detectTaskMode(task, queryAnalysis);
    
    // Get conversation context
    const conversationContext = conversationId ? 
      this.conversationTracker.getConversationContext(conversationId) : null;
    
    // Get relevance scores for all files
    const fileScores = await this.calculateEnhancedRelevanceScores({
      taskType,
      taskMode,
      currentFile,
      projectFiles,
      taskDescription: task,
      queryAnalysis,
      conversationContext,
      progressiveLevel
    });

    // Build context within token budget
    const context = this.buildOptimalContext({
      fileScores,
      targetTokens,
      currentFile,
      conversationId
    });

    // Record this context selection for learning
    const sessionId = this.recordContextUsage({
      taskType,
      taskMode,
      task,
      includedFiles: context.included.map(f => f.path),
      confidenceScores: context.included.reduce((acc, f) => {
        acc[f.path] = f.confidence;
        return acc;
      }, {}),
      model,
      conversationId
    });

    this.lastSessionId = sessionId;

    return {
      ...context,
      sessionId,
      queryAnalysis,
      taskMode,
      suggestions: this.generateSuggestions(context, taskMode)
    };
  }

  detectTaskMode(task, queryAnalysis) {
    // Check against task mode patterns
    const modePatterns = db.prepare(
      'SELECT * FROM task_mode_patterns'
    ).all();

    let bestMode = 'general';
    let highestScore = 0;

    for (const pattern of modePatterns) {
      const keywords = JSON.parse(pattern.common_keywords);
      let score = 0;

      // Check keyword matches
      for (const keyword of keywords) {
        if (task.toLowerCase().includes(keyword)) {
          score += 0.2;
        }
      }

      // Check intent alignment
      if (pattern.task_mode === 'debug' && queryAnalysis.intent === 'fix') {
        score += 0.3;
      } else if (pattern.task_mode === 'feature' && queryAnalysis.intent === 'implement') {
        score += 0.3;
      } else if (pattern.task_mode === 'refactor' && queryAnalysis.intent === 'modify') {
        score += 0.3;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMode = pattern.task_mode;
      }
    }

    return bestMode;
  }

  async calculateEnhancedRelevanceScores(params) {
    const {
      taskType,
      taskMode,
      currentFile,
      projectFiles,
      taskDescription,
      queryAnalysis,
      conversationContext,
      progressiveLevel
    } = params;

    const scores = new Map();
    
    // Get task mode priorities
    const modePattern = db.prepare(
      'SELECT * FROM task_mode_patterns WHERE task_mode = ?'
    ).get(taskMode);
    
    const prioritySignals = modePattern ? 
      JSON.parse(modePattern.priority_signals) : {};

    for (const file of projectFiles) {
      let score = 0.1; // Base score
      let confidence = 0.5; // Confidence in the score
      const reasons = []; // Track why file was scored

      // Skip files already viewed in conversation
      if (conversationContext && conversationContext.filesViewed.includes(file.path)) {
        if (progressiveLevel === 1) {
          continue; // Skip in immediate context
        } else {
          score *= 0.5; // Reduce score for already viewed files
          reasons.push('Already viewed in conversation');
        }
      }

      // 1. Semantic relevance (NEW)
      const semanticSimilarity = this.semanticSearch.calculateSemanticSimilarity(
        queryAnalysis, 
        file
      );
      if (semanticSimilarity > 0) {
        score += semanticSimilarity * 0.25;
        confidence += 0.1;
        reasons.push(`Semantic match (${(semanticSimilarity * 100).toFixed(0)}%)`);
      }

      // 2. Historical relevance from database
      const historicalScore = this.getHistoricalRelevance(file.path, taskType, taskMode);
      if (historicalScore.score > 0.5) {
        score += historicalScore.score * 0.2;
        confidence = Math.max(confidence, historicalScore.confidence);
        reasons.push(`Historical relevance (${(historicalScore.score * 100).toFixed(0)}%)`);
      }

      // 3. Task mode specific scoring
      if (taskMode === 'debug') {
        // Check if file was recently modified
        const isRecent = await this.gitAnalyzer.hasRecentChanges(file.path, 48);
        if (isRecent) {
          score += 0.3;
          reasons.push('Recently modified');
        }
        
        // Check for error handling
        if (file.path.includes('error') || file.path.includes('exception')) {
          score += 0.2;
          reasons.push('Error handling file');
        }
      } else if (taskMode === 'feature') {
        // Check for similar features
        if (this.isSimilarFeature(file.path, queryAnalysis.concepts)) {
          score += 0.3;
          reasons.push('Similar feature pattern');
        }
      } else if (taskMode === 'refactor') {
        // All usages are important
        if (this.hasImportRelationship(currentFile, file.path, projectFiles)) {
          score += 0.4;
          reasons.push('Direct dependency');
        }
      }

      // 4. Import relationship score
      if (this.hasImportRelationship(currentFile, file.path, projectFiles)) {
        score += 0.25;
        reasons.push('Import relationship');
      }

      // 5. Git co-change score (NEW)
      const coChangeScore = await this.getGitCoChangeScore(currentFile, file.path);
      if (coChangeScore > 0) {
        score += coChangeScore * 0.15;
        reasons.push(`Frequently changed together (${(coChangeScore * 100).toFixed(0)}%)`);
      }

      // 6. Path similarity score
      const pathSimilarity = this.calculatePathSimilarity(currentFile, file.path);
      if (pathSimilarity > 0.5) {
        score += pathSimilarity * 0.1;
        reasons.push('Same directory/feature');
      }

      // 7. Progressive loading adjustment
      if (progressiveLevel === 1 && score < 0.6) {
        continue; // Only include high-relevance files in immediate context
      }

      scores.set(file.path, {
        score: Math.min(score, 1.0),
        confidence: Math.min(confidence, 1.0),
        reasons
      });
    }

    return scores;
  }

  isSimilarFeature(filePath, concepts) {
    // Check if file path contains any of the concepts
    const pathLower = filePath.toLowerCase();
    return concepts.some(concept => pathLower.includes(concept));
  }

  async getGitCoChangeScore(fileA, fileB) {
    const result = db.prepare(`
      SELECT git_co_change_count, strength 
      FROM file_relationships 
      WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
    `).get(fileA, fileB, fileB, fileA);

    if (result && result.git_co_change_count > 0) {
      // Normalize based on typical co-change counts
      return Math.min(result.git_co_change_count / 10, 1.0);
    }
    return 0;
  }

  getHistoricalRelevance(filePath, taskType, taskMode) {
    const query = db.prepare(`
      SELECT relevance_score, confidence 
      FROM file_relevance 
      WHERE file_path = ? AND task_type = ? AND task_mode = ?
    `);
    
    const result = query.get(filePath, taskType, taskMode);
    return result || { score: 0.5, confidence: 0.5 };
  }

  buildOptimalContext({ fileScores, targetTokens, currentFile, conversationId }) {
    const sortedFiles = Array.from(fileScores.entries())
      .sort((a, b) => b[1].score - a[1].score);

    const included = [];
    const excluded = [];
    let totalTokens = 0;

    for (const [filePath, scoreData] of sortedFiles) {
      const fileContent = this.getFileContent(filePath);
      const tokens = this.countTokens(fileContent);

      if (filePath === currentFile || 
          (totalTokens + tokens <= targetTokens && scoreData.score > 0.3)) {
        included.push({
          path: filePath,
          score: scoreData.score,
          confidence: scoreData.confidence,
          tokens,
          reasons: scoreData.reasons,
          content: fileContent // Include actual content
        });
        totalTokens += tokens;

        // Track in conversation
        if (conversationId) {
          this.conversationTracker.markFileViewed(conversationId, filePath);
        }
      } else {
        excluded.push({
          path: filePath,
          score: scoreData.score,
          reasons: totalTokens + tokens > targetTokens ? 
            ['Token budget exceeded'] : ['Low relevance score']
        });
      }
    }

    return {
      included,
      excluded,
      totalTokens,
      tokenBudget: targetTokens
    };
  }

  getFileContent(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      return readFileSync(fullPath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return `// Error reading file: ${filePath}`;
    }
  }

  recordContextUsage(params) {
    const insert = db.prepare(`
      INSERT INTO context_sessions 
      (conversation_id, task_type, task_mode, task_description, 
       included_files, confidence_scores, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      params.conversationId,
      params.taskType,
      params.taskMode,
      params.task,
      JSON.stringify(params.includedFiles),
      JSON.stringify(params.confidenceScores),
      params.model
    );

    return result.lastInsertRowid;
  }

  generateSuggestions(context, taskMode) {
    const suggestions = [];

    if (taskMode === 'debug' && context.excluded.length > 0) {
      const testFiles = context.excluded.filter(f => 
        f.path.includes('test') || f.path.includes('spec')
      );
      if (testFiles.length > 0) {
        suggestions.push({
          type: 'expand',
          message: 'Consider including test files for better debugging context',
          files: testFiles.slice(0, 3).map(f => f.path)
        });
      }
    }

    if (context.totalTokens < context.tokenBudget * 0.5) {
      suggestions.push({
        type: 'expand',
        message: 'You have significant token budget remaining. Consider expanding context.',
        availableTokens: context.tokenBudget - context.totalTokens
      });
    }

    return suggestions;
  }

  // Other methods remain the same...
  classifyTask(taskDescription) {
    const patterns = {
      'debug': /fix|bug|error|issue|problem|debug|crash|fail/i,
      'feature': /add|create|implement|build|new feature|develop/i,
      'refactor': /refactor|clean|improve|optimize|restructure|reorganize/i,
      'test': /test|testing|unit test|integration|spec/i,
      'docs': /document|docs|comment|explain|readme/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(taskDescription)) {
        return type;
      }
    }

    return 'general';
  }

  hasImportRelationship(fileA, fileB, projectFiles) {
    const fileAData = projectFiles.find(f => f.path === fileA);
    const fileBData = projectFiles.find(f => f.path === fileB);
    
    if (!fileAData || !fileBData) return false;
    
    const aImportsB = fileAData.imports.some(imp => 
      imp.includes(fileB.replace(/\.[^.]+$/, ''))
    );
    const bImportsA = fileBData.imports.some(imp => 
      imp.includes(fileA.replace(/\.[^.]+$/, ''))
    );
    
    return aImportsB || bImportsA;
  }

  calculatePathSimilarity(pathA, pathB) {
    const partsA = pathA.split('/');
    const partsB = pathB.split('/');
    
    let commonParts = 0;
    const minLength = Math.min(partsA.length, partsB.length);
    
    for (let i = 0; i < minLength - 1; i++) {
      if (partsA[i] === partsB[i]) {
        commonParts++;
      }
    }
    
    return commonParts / Math.max(partsA.length, partsB.length);
  }

  countTokens(text) {
    try {
      return this.tokenizer.encode(text).length;
    } catch {
      return Math.ceil(text.length / 4);
    }
  }
}
```

## Step 7: Enhanced MCP Server

### 7.1 Update `src/index.js`

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initDatabase } from './database.js';
import { FileScanner } from './fileScanner.js';
import { ContextAnalyzer } from './contextAnalyzer.js';
import { ContextLearning } from './learning.js';
import { GitAnalyzer } from './gitAnalyzer.js';

// Initialize database
initDatabase();

// Get project root from environment or default
const projectRoot = process.env.PROJECT_ROOT || process.cwd();

// Initialize components
const analyzer = new ContextAnalyzer(projectRoot);
const learning = new ContextLearning();
const gitAnalyzer = new GitAnalyzer(projectRoot);

// Create MCP server
const server = new Server(
  {
    name: 'smart-context-pruning',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define enhanced tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_optimal_context',
        description: 'Get optimal file context for a coding task with semantic understanding',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Description of the coding task',
            },
            currentFile: {
              type: 'string',
              description: 'Path to the current file being edited',
            },
            projectRoot: {
              type: 'string',
              description: 'Root directory of the project',
              default: projectRoot,
            },
            targetTokens: {
              type: 'number',
              description: 'Target token budget (default: 6000)',
              default: 6000,
            },
            model: {
              type: 'string',
              description: 'LLM model being used',
              default: 'claude-3-opus',
            },
            conversationId: {
              type: 'string',
              description: 'Conversation ID for context tracking',
            },
            progressiveLevel: {
              type: 'number',
              description: 'Progressive loading level (1=immediate, 2=expanded, 3=comprehensive)',
              default: 1,
            },
          },
          required: ['task', 'currentFile'],
        },
      },
      {
        name: 'expand_context',
        description: 'Expand context to include more files',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'number',
              description: 'Session ID from get_optimal_context',
            },
            additionalTokens: {
              type: 'number',
              description: 'Additional tokens to include',
              default: 2000,
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'record_session_outcome',
        description: 'Record whether a context selection was successful',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'number',
              description: 'Session ID from get_optimal_context',
            },
            wasSuccessful: {
              type: 'boolean',
              description: 'Whether the task was completed successfully',
            },
            filesActuallyUsed: {
              type: 'array',
              description: 'Which files were actually helpful',
              items: { type: 'string' },
            },
          },
          required: ['sessionId', 'wasSuccessful'],
        },
      },
      {
        name: 'get_file_relationships',
        description: 'Get files related to a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'File to find relationships for',
            },
            relationshipType: {
              type: 'string',
              description: 'Type of relationship (import, git-co-change, all)',
              default: 'all',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'search_codebase',
        description: 'Semantic search across the codebase',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'analyze_git_patterns',
        description: 'Analyze git history for file relationships',
        inputSchema: {
          type: 'object',
          properties: {
            commitLimit: {
              type: 'number',
              description: 'Number of commits to analyze',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_learning_insights',
        description: 'Get insights about learned patterns',
        inputSchema: {
          type: 'object',
          properties: {
            taskMode: {
              type: 'string',
              description: 'Filter by task mode (debug, feature, refactor)',
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_optimal_context': {
      // Scan project files
      const scanner = new FileScanner(args.projectRoot || projectRoot);
      const projectFiles = scanner.scanCodebase();

      // Get optimal context
      const context = await analyzer.getOptimalContext({
        task: args.task,
        currentFile: args.currentFile,
        targetTokens: args.targetTokens || 6000,
        model: args.model || 'claude-3-opus',
        projectFiles,
        conversationId: args.conversationId,
        progressiveLevel: args.progressiveLevel || 1,
      });

      // Format response with clear reasoning
      const response = {
        sessionId: context.sessionId,
        taskMode: context.taskMode,
        queryInterpretation: {
          intent: context.queryAnalysis.intent,
          concepts: context.queryAnalysis.concepts,
          entities: context.queryAnalysis.entities,
        },
        context: {
          included: context.included.map(f => ({
            path: f.path,
            relevanceScore: (f.score * 100).toFixed(0) + '%',
            confidence: (f.confidence * 100).toFixed(0) + '%',
            reasons: f.reasons,
            tokens: f.tokens,
          })),
          excluded: context.excluded.slice(0, 5).map(f => ({
            path: f.path,
            score: (f.score * 100).toFixed(0) + '%',
            reasons: f.reasons,
          })),
        },
        usage: {
          totalTokens: context.totalTokens,
          tokenBudget: context.tokenBudget,
          percentUsed: ((context.totalTokens / context.tokenBudget) * 100).toFixed(0) + '%',
        },
        suggestions: context.suggestions,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    case 'expand_context': {
      // Implementation for progressive context expansion
      return {
        content: [
          {
            type: 'text',
            text: 'Context expansion not yet implemented in this MVP',
          },
        ],
      };
    }

    case 'record_session_outcome': {
      learning.updateRelevanceScores(
        args.sessionId,
        args.wasSuccessful,
        args.filesActuallyUsed
      );

      return {
        content: [
          {
            type: 'text',
            text: 'Session outcome recorded. Learning model updated.',
          },
        ],
      };
    }

    case 'search_codebase': {
      const scanner = new FileScanner(projectRoot);
      const projectFiles = scanner.scanCodebase();
      
      const queryAnalysis = analyzer.semanticSearch.analyzeQuery(args.query);
      const results = await analyzer.semanticSearch.findSimilarFiles(
        queryAnalysis,
        projectFiles,
        args.limit || 10
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              interpretation: queryAnalysis,
              results: results.map(r => ({
                file: r.file,
                similarity: (r.similarity * 100).toFixed(0) + '%',
                matchedConcepts: r.matchedConcepts,
              })),
            }, null, 2),
          },
        ],
      };
    }

    case 'analyze_git_patterns': {
      const coChanges = await gitAnalyzer.analyzeCoChanges(args.commitLimit || 100);
      const recentFiles = await gitAnalyzer.getRecentlyModifiedFiles(48);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              analyzedCommits: args.commitLimit || 100,
              coChangePatterns: Array.from(coChanges.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([files, count]) => ({
                  files: files.split('|'),
                  coChangeCount: count,
                })),
              recentlyModified: recentFiles.slice(0, 10),
            }, null, 2),
          },
        ],
      };
    }

    case 'get_file_relationships': {
      const relationships = learning.getFileRelationships(
        args.filePath,
        args.relationshipType || 'all'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(relationships, null, 2),
          },
        ],
      };
    }

    case 'get_learning_insights': {
      const insights = learning.getEnhancedInsights(args.taskMode);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(insights, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Smart Context Pruning MCP server v2.0 running on stdio');
  
  // Run initial git analysis in background
  setTimeout(() => {
    gitAnalyzer.analyzeCoChanges(100).catch(console.error);
  }, 1000);
}

main().catch(console.error);
```

## Step 8: Enhanced Learning Module

### 8.1 Update `src/learning.js`

```javascript
import { db } from './database.js';

export class ContextLearning {
  updateRelevanceScores(sessionId, wasSuccessful, filesActuallyUsed = []) {
    const session = db.prepare(
      'SELECT * FROM context_sessions WHERE id = ?'
    ).get(sessionId);

    if (!session) return;

    const includedFiles = JSON.parse(session.included_files);
    const taskType = session.task_type;
    const taskMode = session.task_mode;

    // Update session outcome
    db.prepare(`
      UPDATE context_sessions 
      SET outcome_success = ?, 
          files_actually_used = ?
      WHERE id = ?
    `).run(
      wasSuccessful ? 1 : 0, 
      JSON.stringify(filesActuallyUsed),
      sessionId
    );

    // Update file relevance with different weights
    for (const filePath of includedFiles) {
      const wasActuallyUsed = filesActuallyUsed.includes(filePath);
      const scoreAdjustment = this.calculateScoreAdjustment(
        wasSuccessful,
        wasActuallyUsed
      );
      
      this.updateFileRelevance(filePath, taskType, taskMode, scoreAdjustment);
    }

    // Update file relationships based on actual usage
    if (wasSuccessful && filesActuallyUsed.length > 1) {
      this.updateFileRelationships(filesActuallyUsed, true, 'actually-used-together');
    }
  }

  calculateScoreAdjustment(wasSuccessful, wasActuallyUsed) {
    if (wasSuccessful && wasActuallyUsed) return 0.15;  // Strong positive
    if (wasSuccessful && !wasActuallyUsed) return -0.05; // Slight negative
    if (!wasSuccessful && wasActuallyUsed) return 0.05;  // Slight positive
    return -0.1; // Not successful and not used
  }

  updateFileRelevance(filePath, taskType, taskMode, scoreAdjustment) {
    const existing = db.prepare(`
      SELECT * FROM file_relevance 
      WHERE file_path = ? AND task_type = ? AND task_mode = ?
    `).get(filePath, taskType, taskMode);

    if (existing) {
      const alpha = 0.1; // Learning rate
      const newScore = existing.relevance_score + alpha * scoreAdjustment;
      const newConfidence = Math.min(existing.confidence + 0.05, 1.0);
      
      db.prepare(`
        UPDATE file_relevance 
        SET relevance_score = ?,
            confidence = ?,
            success_count = success_count + ?,
            total_count = total_count + 1,
            last_updated = CURRENT_TIMESTAMP
        WHERE file_path = ? AND task_type = ? AND task_mode = ?
      `).run(
        Math.max(0, Math.min(1, newScore)),
        newConfidence,
        scoreAdjustment > 0 ? 1 : 0,
        filePath,
        taskType,
        taskMode
      );
    } else {
      db.prepare(`
        INSERT INTO file_relevance 
        (file_path, task_type, task_mode, relevance_score, confidence, success_count, total_count)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(
        filePath,
        taskType,
        taskMode,
        0.5 + scoreAdjustment,
        0.5,
        scoreAdjustment > 0 ? 1 : 0
      );
    }
  }

  updateFileRelationships(files, wasSuccessful, relationshipType = 'co-selected') {
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const fileA = files[i];
        const fileB = files[j];
        
        const existing = db.prepare(`
          SELECT * FROM file_relationships 
          WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
        `).get(fileA, fileB, fileB, fileA);

        const strengthAdjustment = wasSuccessful ? 0.1 : -0.05;

        if (existing) {
          db.prepare(`
            UPDATE file_relationships 
            SET co_occurrence_count = co_occurrence_count + 1,
                strength = ?,
                relationship_type = ?
            WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
          `).run(
            Math.max(0, Math.min(1, existing.strength + strengthAdjustment)),
            relationshipType,
            fileA, fileB, fileB, fileA
          );
        } else {
          db.prepare(`
            INSERT INTO file_relationships 
            (file_a, file_b, co_occurrence_count, relationship_type, strength)
            VALUES (?, ?, 1, ?, ?)
          `).run(fileA, fileB, relationshipType, 0.5 + strengthAdjustment);
        }
      }
    }
  }

  getFileRelationships(filePath, relationshipType = 'all') {
    let query = `
      SELECT * FROM file_relationships 
      WHERE (file_a = ? OR file_b = ?)
    `;
    
    if (relationshipType !== 'all') {
      query += ` AND relationship_type = ?`;
    }
    
    query += ` ORDER BY strength DESC LIMIT 20`;

    const stmt = db.prepare(query);
    const results = relationshipType === 'all' ? 
      stmt.all(filePath, filePath) : 
      stmt.all(filePath, filePath, relationshipType);

    return results.map(r => ({
      relatedFile: r.file_a === filePath ? r.file_b : r.file_a,
      type: r.relationship_type,
      strength: (r.strength * 100).toFixed(0) + '%',
      coOccurrences: r.co_occurrence_count,
      gitCoChanges: r.git_co_change_count || 0,
    }));
  }

  getEnhancedInsights(taskMode = null) {
    // Task mode specific stats
    let taskQuery = `
      SELECT 
        task_type,
        task_mode,
        COUNT(*) as session_count,
        SUM(outcome_success) as success_count,
        AVG(total_tokens) as avg_tokens,
        COUNT(DISTINCT conversation_id) as unique_conversations
      FROM context_sessions
    `;
    
    if (taskMode) {
      taskQuery += ` WHERE task_mode = ?`;
    }
    
    taskQuery += ` GROUP BY task_type, task_mode`;
    
    const taskStats = taskMode ? 
      db.prepare(taskQuery).all(taskMode) : 
      db.prepare(taskQuery).all();

    // Top performing files by mode
    const topFilesQuery = `
      SELECT 
        file_path,
        task_mode,
        relevance_score,
        confidence,
        success_count,
        total_count,
        ROUND(CAST(success_count AS REAL) / total_count * 100, 1) as success_rate
      FROM file_relevance
      WHERE relevance_score > 0.7
      ${taskMode ? 'AND task_mode = ?' : ''}
      ORDER BY relevance_score DESC, confidence DESC
      LIMIT 20
    `;

    const topFiles = taskMode ?
      db.prepare(topFilesQuery).all(taskMode) :
      db.prepare(topFilesQuery).all();

    // Most successful file combinations
    const successfulCombos = db.prepare(`
      SELECT 
        included_files,
        task_mode,
        COUNT(*) as usage_count,
        SUM(outcome_success) as success_count
      FROM context_sessions
      WHERE outcome_success = 1
      ${taskMode ? 'AND task_mode = ?' : ''}
      GROUP BY included_files, task_mode
      HAVING usage_count > 2
      ORDER BY success_count DESC
      LIMIT 10
    `).all(taskMode || undefined);

    // Learning progress over time
    const learningProgress = db.prepare(`
      SELECT 
        DATE(timestamp) as date,
        AVG(CASE WHEN outcome_success THEN 1.0 ELSE 0.0 END) as success_rate,
        COUNT(*) as sessions
      FROM context_sessions
      WHERE timestamp > datetime('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();

    return {
      taskModeStats: taskStats.map(t => ({
        ...t,
        successRate: ((t.success_count / t.session_count) * 100).toFixed(1) + '%',
      })),
      topPerformingFiles: topFiles,
      successfulCombinations: successfulCombos.map(c => ({
        files: JSON.parse(c.included_files),
        mode: c.task_mode,
        usageCount: c.usage_count,
        successCount: c.success_count,
        successRate: ((c.success_count / c.usage_count) * 100).toFixed(1) + '%',
      })),
      learningProgress,
      summary: {
        totalSessions: taskStats.reduce((sum, t) => sum + t.session_count, 0),
        overallSuccessRate: (
          (taskStats.reduce((sum, t) => sum + t.success_count, 0) /
           taskStats.reduce((sum, t) => sum + t.session_count, 0)) * 100
        ).toFixed(1) + '%',
        mostSuccessfulMode: taskStats.sort((a, b) => 
          (b.success_count / b.session_count) - (a.success_count / a.session_count)
        )[0]?.task_mode || 'none',
      },
    };
  }
}
```

## Step 9: Example Usage with Claude

```
User: I need to debug why user notifications aren't showing up after they follow someone

Claude: I'll analyze your request and find the most relevant files for debugging this notification issue.

[Uses get_optimal_context tool with conversationId]

Based on my semantic analysis, I understand you're debugging a notification system issue specifically related to the "follow" action. Here's what I found:

**Task Mode**: Debug (detected from "why... aren't showing up")
**Key Concepts**: notifications, user actions, follow functionality

**Most Relevant Files** (confidence levels shown):

1. `src/services/notification.service.ts` (95% confidence)
   - Reasons: Semantic match (87%), Historical relevance for notification bugs (92%)
   - Contains the main notification creation logic

2. `src/features/social/actions/follow.action.ts` (89% confidence)
   - Reasons: Directly handles follow actions, Recently modified (2 days ago)
   - This is where notifications should be triggered

3. `src/models/notification.model.ts` (82% confidence)
   - Reasons: Frequently changed with notification.service.ts, Defines notification types

4. `tests/notifications/follow.test.ts` (78% confidence)
   - Reasons: Contains test cases for follow notifications, May reveal expected behavior

**Excluded but Notable**:
- `src/api/notifications.api.ts` - Low relevance for this specific bug
- `src/ui/NotificationList.tsx` - UI display, not creation issue

**Git Analysis**: The notification service and follow action files were modified together in 3 recent commits, suggesting they're closely related.

Would you like me to expand the context to include more files, or shall we start debugging with these?
```

## Conclusion

This enhanced MVP incorporates all the key feedback from LLMs:

1. **Semantic Understanding** - Uses NLP to understand intent beyond keywords
2. **Task-Specific Modes** - Different strategies for debug/feature/refactor
3. **Full Transparency** - Shows confidence scores and reasoning for every file
4. **Progressive Loading** - Can start narrow and expand as needed
5. **Conversation Awareness** - Tracks what's been viewed to avoid repetition
6. **Git Integration** - Analyzes co-change patterns for better predictions
7. **Learning from Usage** - Tracks which files were actually helpful

The system provides clear explanations for its choices and learns from real usage patterns to improve over time.