import initSqlJs from 'sql.js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import logger from './logger.js';

/**
 * Improved database implementation with proper concurrency handling
 * Fixes the critical concurrent access issues found in testing
 */

class ConcurrentDatabase {
  constructor() {
    this.db = null;
    this.dbPath = './data/context.db';
    this.isInitialized = false;
    
    // Concurrency control
    this.operationQueue = [];
    this.isProcessingQueue = false;
    this.maxConcurrentOperations = 3;
    this.activeOperations = 0;
    
    // Connection pooling simulation
    this.connections = new Map();
    this.connectionTimeout = 5000; // 5 seconds
    
    // Statistics
    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      queuedOperations: 0,
      averageWaitTime: 0
    };
  }

  async initialize() {
    if (this.isInitialized) {
      return this.db;
    }

    try {
      logger.info('Initializing concurrent database...');
      
      // Create data directory
      mkdirSync('./data', { recursive: true });
      
      // Initialize SQL.js
      const SQL = await initSqlJs();
      
      // Load existing database or create new one
      if (existsSync(this.dbPath)) {
        const filebuffer = readFileSync(this.dbPath);
        this.db = new SQL.Database(filebuffer);
        logger.info('Loaded existing database');
      } else {
        this.db = new SQL.Database();
        logger.info('Created new database');
      }
      
      // Create all required tables
      await this.createTables();
      
      // Set up database optimizations
      await this.optimizeDatabase();
      
      this.isInitialized = true;
      logger.info('Database initialization completed');
      
      return this.db;
      
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      {
        name: 'context_sessions',
        sql: `
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
        `
      },
      {
        name: 'file_relevance',
        sql: `
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
        `
      },
      {
        name: 'file_embeddings',
        sql: `
          CREATE TABLE IF NOT EXISTS file_embeddings (
            file_path TEXT PRIMARY KEY,
            embedding BLOB,
            summary TEXT,
            key_concepts TEXT,
            last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'conversation_context',
        sql: `
          CREATE TABLE IF NOT EXISTS conversation_context (
            conversation_id TEXT PRIMARY KEY,
            files_viewed TEXT,
            current_task TEXT,
            task_progress TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'file_relationships',
        sql: `
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
        `
      },
      {
        name: 'task_mode_patterns',
        sql: `
          CREATE TABLE IF NOT EXISTS task_mode_patterns (
            task_mode TEXT PRIMARY KEY,
            file_patterns TEXT,
            priority_signals TEXT,
            common_keywords TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'user_overrides',
        sql: `
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
        `
      }
    ];

    for (const table of tables) {
      try {
        await this.execute(table.sql);
        logger.debug(`Created/verified table: ${table.name}`);
      } catch (error) {
        logger.error(`Failed to create table ${table.name}:`, error);
        throw error;
      }
    }
  }

  async optimizeDatabase() {
    const optimizations = [
      // Enable WAL mode for better concurrency
      'PRAGMA journal_mode=WAL',
      
      // Set synchronous to NORMAL for better performance
      'PRAGMA synchronous=NORMAL',
      
      // Increase cache size
      'PRAGMA cache_size=10000',
      
      // Set busy timeout for concurrent access
      'PRAGMA busy_timeout=3000',
      
      // Create indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_context_sessions_conversation ON context_sessions(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_context_sessions_timestamp ON context_sessions(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_file_relevance_lookup ON file_relevance(file_path, task_type, task_mode)',
      'CREATE INDEX IF NOT EXISTS idx_file_relationships_lookup ON file_relationships(file_a, file_b)'
    ];

    for (const optimization of optimizations) {
      try {
        await this.execute(optimization);
        logger.debug('Applied optimization:', optimization.split(' ')[1]);
      } catch (error) {
        logger.warn('Optimization failed (non-critical):', optimization, error.message);
      }
    }
  }

  /**
   * Execute database operation with concurrency control
   */
  async execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      const operation = {
        sql,
        params,
        resolve,
        reject,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      };
      
      this.queueOperation(operation);
    });
  }

  /**
   * Queue management for concurrent operations
   */
  queueOperation(operation) {
    this.operationQueue.push(operation);
    this.stats.queuedOperations++;
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessingQueue) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.operationQueue.length > 0 && this.activeOperations < this.maxConcurrentOperations) {
      const operation = this.operationQueue.shift();
      
      if (operation) {
        this.activeOperations++;
        this.executeOperation(operation);
      }
    }
    
    // If no more operations to process
    if (this.activeOperations === 0) {
      this.isProcessingQueue = false;
    } else {
      // Check again after a short delay
      setTimeout(() => {
        this.isProcessingQueue = false;
        this.processQueue();
      }, 10);
    }
  }

  async executeOperation(operation) {
    const startTime = Date.now();
    
    try {
      // Add timeout protection
      const result = await Promise.race([
        this.performDatabaseOperation(operation),
        this.createTimeoutPromise(this.connectionTimeout, `Operation ${operation.id} timed out`)
      ]);
      
      // Calculate wait time
      const waitTime = Date.now() - operation.timestamp;
      this.updateStats(true, waitTime);
      
      operation.resolve(result);
      
    } catch (error) {
      logger.error(`Database operation failed:`, {
        sql: operation.sql.substring(0, 100),
        error: error.message,
        operationId: operation.id
      });
      
      this.updateStats(false, Date.now() - operation.timestamp);
      operation.reject(error);
      
    } finally {
      this.activeOperations--;
      
      // Continue processing queue
      if (this.operationQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1);
      }
    }
  }

  async performDatabaseOperation(operation) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const { sql, params } = operation;
    
    try {
      // Determine operation type
      const sqlType = sql.trim().toUpperCase();
      
      if (sqlType.startsWith('SELECT')) {
        // Read operations
        if (params.length > 0) {
          const stmt = this.db.prepare(sql);
          return stmt.get(...params);
        } else {
          return this.db.exec(sql);
        }
        
      } else if (sqlType.startsWith('INSERT') || sqlType.startsWith('UPDATE') || sqlType.startsWith('DELETE')) {
        // Write operations
        if (params.length > 0) {
          const stmt = this.db.prepare(sql);
          return stmt.run(...params);
        } else {
          return this.db.run(sql);
        }
        
      } else {
        // DDL operations (CREATE, ALTER, etc.)
        return this.db.run(sql);
      }
      
    } catch (error) {
      // Enhanced error context
      throw new Error(`SQL Error: ${error.message} | SQL: ${sql.substring(0, 100)}...`);
    }
  }

  createTimeoutPromise(timeoutMs, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    });
  }

  updateStats(success, waitTime) {
    this.stats.totalQueries++;
    
    if (success) {
      this.stats.successfulQueries++;
    } else {
      this.stats.failedQueries++;
    }
    
    // Update average wait time
    this.stats.averageWaitTime = (
      (this.stats.averageWaitTime * (this.stats.totalQueries - 1) + waitTime) / 
      this.stats.totalQueries
    );
  }

  /**
   * Prepared statement support with concurrency
   */
  async prepare(sql) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return {
      get: async (...params) => {
        return this.execute(sql, params);
      },
      
      run: async (...params) => {
        return this.execute(sql, params);
      },
      
      all: async (...params) => {
        const result = await this.execute(`${sql} ORDER BY rowid`, params);
        return Array.isArray(result) ? result : [result];
      }
    };
  }

  /**
   * Transaction support
   */
  async transaction(callback) {
    await this.execute('BEGIN TRANSACTION');
    
    try {
      await callback(this);
      await this.execute('COMMIT');
    } catch (error) {
      await this.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * Database maintenance and cleanup
   */
  async vacuum() {
    logger.info('Running database vacuum...');
    await this.execute('VACUUM');
  }

  async analyze() {
    logger.info('Running database analyze...');
    await this.execute('ANALYZE');
  }

  /**
   * Save database to disk
   */
  async save() {
    if (!this.isInitialized) {
      return;
    }
    
    try {
      const data = this.db.export();
      writeFileSync(this.dbPath, data);
      logger.debug('Database saved to disk');
    } catch (error) {
      logger.error('Failed to save database:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.operationQueue.length,
      activeOperations: this.activeOperations,
      isInitialized: this.isInitialized,
      successRate: this.stats.totalQueries > 0 ? 
        (this.stats.successfulQueries / this.stats.totalQueries * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.execute('SELECT 1');
      return {
        status: 'healthy',
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        stats: this.getStats()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async close() {
    logger.info('Closing database connection...');
    
    // Wait for pending operations
    while (this.operationQueue.length > 0 || this.activeOperations > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Save to disk
    await this.save();
    
    // Close connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.isInitialized = false;
    logger.info('Database connection closed');
  }
}

// Create singleton instance
const concurrentDb = new ConcurrentDatabase();

// Initialize database function for compatibility
export async function initDatabase() {
  return concurrentDb.initialize();
}

// Export database instance for compatibility
export { concurrentDb as db };

// Enhanced exports
export {
  ConcurrentDatabase,
  concurrentDb as concurrentDatabase
};