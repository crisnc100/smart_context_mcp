import initSqlJs from 'sql.js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

let db = null;
const dbPath = './data/context.db';

export async function initDatabase() {
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

  db.run(`
    CREATE TABLE IF NOT EXISTS file_embeddings (
      file_path TEXT PRIMARY KEY,
      embedding BLOB,
      summary TEXT,
      key_concepts TEXT,
      last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  db.run(`
    CREATE TABLE IF NOT EXISTS task_mode_patterns (
      task_mode TEXT PRIMARY KEY,
      file_patterns TEXT,
      priority_signals TEXT,
      common_keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // New tables for override tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS user_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      override_type TEXT NOT NULL, -- 'added', 'removed', 'kept'
      task_type TEXT NOT NULL,
      task_mode TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES context_sessions(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS override_patterns (
      file_path TEXT NOT NULL,
      task_pattern TEXT NOT NULL,
      override_count INTEGER DEFAULT 1,
      last_override_type TEXT,
      cumulative_adjustment REAL DEFAULT 0.0,
      confidence REAL DEFAULT 0.5,
      PRIMARY KEY (file_path, task_pattern)
    )
  `);

  // Project scope configuration
  db.run(`
    CREATE TABLE IF NOT EXISTS project_scopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      include_paths TEXT, -- JSON array
      exclude_paths TEXT, -- JSON array
      max_depth INTEGER,
      is_active BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize default task mode patterns
  initializeTaskModePatterns();
  
  // Save database periodically
  setInterval(() => saveDatabase(), 30000); // Save every 30 seconds
}

function saveDatabase() {
  // Allow disabling saves via environment variable
  if (process.env.SMART_CONTEXT_DISABLE_SAVE === 'true') {
    return;
  }
  
  if (db) {
    try {
      const data = db.export();
      writeFileSync(dbPath, Buffer.from(data));
    } catch (error) {
      console.error('Failed to save database:', error.message);
      // Don't throw - allow app to continue running
    }
  }
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

  patterns.forEach(p => {
    db.run(`
      INSERT OR REPLACE INTO task_mode_patterns 
      (task_mode, file_patterns, priority_signals, common_keywords) 
      VALUES (?, ?, ?, ?)
    `, [p.mode, p.patterns, p.signals, p.keywords]);
  });
}

// SQL.js compatible database interface
export const dbInterface = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        
        const lastInsertRowid = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0];
        return { lastInsertRowid };
      },
      get: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const result = stmt.getAsObject();
        stmt.free();
        return result || null;
      },
      all: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  },
  
  run: (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  },
  
  close: () => {
    saveDatabase();
    db.close();
  }
};

// Make db interface compatible with better-sqlite3 API
export { dbInterface as db };

// Cleanup on exit
process.on('exit', () => saveDatabase());
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});