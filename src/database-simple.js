import initSqlJs from 'sql.js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * Simplified database implementation that prioritizes reliability over complexity
 * Fixes concurrent access issues with a simpler approach
 */

let db = null;
const dbPath = './data/context.db';

// Simple mutex for database operations
let operationInProgress = false;
const operationQueue = [];

// Process operations one at a time to avoid conflicts
async function processQueue() {
  if (operationInProgress || operationQueue.length === 0) {
    return;
  }
  
  operationInProgress = true;
  
  while (operationQueue.length > 0) {
    const { operation, resolve, reject } = operationQueue.shift();
    
    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }
  
  operationInProgress = false;
}

// Queue database operations
function queueOperation(operation) {
  return new Promise((resolve, reject) => {
    operationQueue.push({ operation, resolve, reject });
    processQueue();
  });
}

export async function initDatabase() {
  if (db) {
    return db;
  }

  return queueOperation(async () => {
    // Create data directory
    mkdirSync('./data', { recursive: true });
    
    // Initialize SQL.js
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (existsSync(dbPath)) {
      const filebuffer = readFileSync(dbPath);
      db = new SQL.Database(filebuffer);
    } else {
      db = new SQL.Database();
    }
    
    // Create tables
    createTables();
    
    return db;
  });
}

function createTables() {
  // Context sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS context_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT,
      task_type TEXT NOT NULL,
      task_mode TEXT,
      task_description TEXT,
      included_files TEXT NOT NULL,
      excluded_files TEXT,
      confidence_scores TEXT,
      outcome_success BOOLEAN DEFAULT 0,
      files_actually_used TEXT,
      model_used TEXT,
      total_tokens INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // File relevance tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS file_relevance (
      file_path TEXT NOT NULL,
      task_type TEXT NOT NULL,
      task_mode TEXT NOT NULL,
      relevance_score REAL DEFAULT 0.5,
      confidence REAL DEFAULT 0.5,
      success_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (file_path, task_type, task_mode)
    )
  `);

  // File embeddings (if needed)
  db.run(`
    CREATE TABLE IF NOT EXISTS file_embeddings (
      file_path TEXT PRIMARY KEY,
      embedding BLOB,
      summary TEXT,
      key_concepts TEXT,
      last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Conversation context
  db.run(`
    CREATE TABLE IF NOT EXISTS conversation_context (
      conversation_id TEXT PRIMARY KEY,
      files_viewed TEXT,
      current_task TEXT,
      task_progress TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // File relationships
  db.run(`
    CREATE TABLE IF NOT EXISTS file_relationships (
      file_a TEXT NOT NULL,
      file_b TEXT NOT NULL,
      co_occurrence_count INTEGER DEFAULT 0,
      relationship_type TEXT,
      relationship_reason TEXT,
      strength REAL DEFAULT 0.0,
      git_co_change_count INTEGER DEFAULT 0,
      PRIMARY KEY (file_a, file_b)
    )
  `);

  // Task mode patterns
  db.run(`
    CREATE TABLE IF NOT EXISTS task_mode_patterns (
      task_mode TEXT PRIMARY KEY,
      file_patterns TEXT,
      priority_signals TEXT,
      common_keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User overrides tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS user_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      original_files TEXT,
      user_added TEXT,
      user_removed TEXT,
      user_kept TEXT,
      feedback_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Insert default task mode patterns if they don't exist
  const existingPatterns = db.prepare('SELECT COUNT(*) as count FROM task_mode_patterns').get();
  
  if (existingPatterns.count === 0) {
    const defaultPatterns = [
      {
        task_mode: 'debug',
        file_patterns: JSON.stringify(['**/test/**', '**/*test*', '**/*spec*']),
        priority_signals: JSON.stringify({
          'recently_modified': 0.8,
          'error_related': 0.7,
          'test_files': 0.6
        }),
        common_keywords: JSON.stringify(['bug', 'fix', 'error', 'issue', 'debug', 'crash'])
      },
      {
        task_mode: 'feature',
        file_patterns: JSON.stringify(['**/src/**', '**/lib/**', '**/components/**']),
        priority_signals: JSON.stringify({
          'main_files': 0.8,
          'similar_features': 0.7,
          'interfaces': 0.6
        }),
        common_keywords: JSON.stringify(['add', 'new', 'create', 'implement', 'feature'])
      },
      {
        task_mode: 'refactor',
        file_patterns: JSON.stringify(['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx']),
        priority_signals: JSON.stringify({
          'related_files': 0.9,
          'dependencies': 0.8,
          'all_usages': 0.7
        }),
        common_keywords: JSON.stringify(['refactor', 'restructure', 'reorganize', 'clean'])
      }
    ];
    
    const insertPattern = db.prepare(`
      INSERT INTO task_mode_patterns (task_mode, file_patterns, priority_signals, common_keywords)
      VALUES (?, ?, ?, ?)
    `);
    
    for (const pattern of defaultPatterns) {
      insertPattern.run(pattern.task_mode, pattern.file_patterns, pattern.priority_signals, pattern.common_keywords);
    }
  }
}

// Enhanced database object with queue support
const enhancedDb = {
  prepare: (sql) => {
    return {
      get: (...params) => queueOperation(() => {
        if (!db) throw new Error('Database not initialized');
        return db.prepare(sql).get(...params);
      }),
      
      run: (...params) => queueOperation(() => {
        if (!db) throw new Error('Database not initialized');
        return db.prepare(sql).run(...params);
      }),
      
      all: (...params) => queueOperation(() => {
        if (!db) throw new Error('Database not initialized');
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          return stmt.all(...params);
        } else {
          return stmt.all();
        }
      })
    };
  },
  
  run: (sql, ...params) => queueOperation(() => {
    if (!db) throw new Error('Database not initialized');
    return db.run(sql, ...params);
  }),
  
  exec: (sql) => queueOperation(() => {
    if (!db) throw new Error('Database not initialized');
    return db.exec(sql);
  }),
  
  // Save database to disk
  save: () => queueOperation(() => {
    if (!db) return;
    try {
      const data = db.export();
      writeFileSync(dbPath, data);
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }),
  
  // Get stats
  getStats: () => ({
    queueLength: operationQueue.length,
    operationInProgress,
    isInitialized: !!db
  })
};

export { enhancedDb as db };