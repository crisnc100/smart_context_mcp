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