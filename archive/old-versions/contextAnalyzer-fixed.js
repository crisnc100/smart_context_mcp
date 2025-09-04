import { db } from './database-sqljs.js';
import { encode } from 'gpt-tokenizer';
import { readFileSync } from 'fs';
import path from 'path';
import { SemanticSearch } from './semanticSearch.js';
import { ConversationTracker } from './conversationTracker.js';
import { GitAnalyzer } from './gitAnalyzer.js';
import config from './config.js';
import logger from './logger.js';

/**
 * Fixed Context Analyzer with proper error handling, timeouts, and performance improvements
 */
export class ContextAnalyzerFixed {
  constructor(projectRoot) {
    this.semanticSearch = new SemanticSearch();
    this.conversationTracker = new ConversationTracker();
    this.gitAnalyzer = new GitAnalyzer(projectRoot);
    this.projectRoot = projectRoot;
    this.lastSessionId = null;
    
    // Performance and safety settings
    this.maxProcessingTime = 10000; // 10 seconds max
    this.dbQueryTimeout = 2000; // 2 seconds for DB queries
    this.gitTimeout = 3000; // 3 seconds for git operations
    
    // Cache for performance
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  /**
   * Main entry point with comprehensive error handling and timeout protection
   */
  async getOptimalContext(params) {
    const startTime = Date.now();
    
    try {
      // Input validation
      this.validateInput(params);
      
      // Add timeout protection for entire operation
      return await Promise.race([
        this.processContextWithTimeout(params),
        this.createTimeoutPromise(this.maxProcessingTime, 'Context analysis timed out')
      ]);
      
    } catch (error) {
      logger.error('Context analysis failed:', error);
      
      // Return safe fallback instead of crashing
      return this.createFallbackContext(params, error);
    } finally {
      const duration = Date.now() - startTime;
      logger.info(`Context analysis completed in ${duration}ms`);
    }
  }

  /**
   * Validate input parameters to prevent crashes
   */
  validateInput(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Parameters object is required');
    }

    const { task, projectFiles } = params;

    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      throw new Error('Task must be a non-empty string');
    }

    if (!Array.isArray(projectFiles)) {
      throw new Error('ProjectFiles must be an array');
    }

    if (projectFiles.length === 0) {
      logger.warn('No project files provided');
    }
  }

  /**
   * Create timeout promise for operation limiting
   */
  createTimeoutPromise(timeoutMs, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    });
  }

  /**
   * Main processing logic with timeout protection
   */
  async processContextWithTimeout(params) {
    const {
      task,
      currentFile,
      targetTokens = config.get('context.defaultTokenBudget', 6000),
      model = 'claude-3-opus',
      projectFiles = [],
      conversationId = null,
      progressiveLevel = 1,
      minRelevanceScore = config.get('context.minRelevanceScore', 0.3)
    } = params;

    // Check cache first
    const cacheKey = this.generateCacheKey(params);
    const cached = this.getCached(cacheKey);
    if (cached) {
      logger.info('Returning cached context analysis');
      return cached;
    }

    // Safe query analysis with fallbacks
    const queryAnalysis = await this.safeAnalyzeQuery(task);
    const taskType = this.classifyTask(task);
    const taskMode = this.detectTaskMode(task, queryAnalysis);
    
    // Get conversation context safely
    const conversationContext = conversationId ? 
      await this.safeGetConversationContext(conversationId) : null;
    
    // Calculate relevance scores with timeout protection
    const fileScores = await Promise.race([
      this.calculateEnhancedRelevanceScoresSafe({
        taskType,
        taskMode,
        currentFile,
        projectFiles,
        taskDescription: task,
        queryAnalysis,
        conversationContext,
        progressiveLevel
      }),
      this.createTimeoutPromise(8000, 'Relevance calculation timed out')
    ]);

    // Build context
    const context = this.buildOptimalContext({
      fileScores,
      targetTokens,
      currentFile,
      conversationId,
      minRelevanceScore
    });

    // Record usage safely
    const sessionId = await this.safeRecordContextUsage({
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

    const result = {
      ...context,
      taskType,
      taskMode,
      sessionId,
      queryAnalysis: {
        concepts: queryAnalysis.concepts,
        intent: queryAnalysis.intent,
        entities: queryAnalysis.entities
      },
      metadata: {
        totalFiles: projectFiles.length,
        processingTime: Date.now() - Date.now(),
        cacheUsed: false
      }
    };

    // Cache result
    this.setCached(cacheKey, result);
    
    return result;
  }

  /**
   * Safe query analysis with fallbacks
   */
  async safeAnalyzeQuery(query) {
    try {
      return await Promise.race([
        Promise.resolve(this.semanticSearch.analyzeQuery(query)),
        this.createTimeoutPromise(2000, 'Query analysis timed out')
      ]);
    } catch (error) {
      logger.warn('Query analysis failed, using fallback:', error.message);
      return {
        original: query,
        tokens: query.toLowerCase().split(/\s+/),
        concepts: this.extractBasicConcepts(query),
        intent: 'unknown',
        entities: [],
        functionHints: []
      };
    }
  }

  /**
   * Extract basic concepts as fallback
   */
  extractBasicConcepts(query) {
    const basicConcepts = [];
    const words = query.toLowerCase().split(/\s+/);
    
    // Common coding concepts
    const codingTerms = ['component', 'function', 'api', 'service', 'state', 'render', 'data', 'user', 'error', 'test'];
    
    for (const word of words) {
      if (codingTerms.includes(word)) {
        basicConcepts.push(word);
      }
    }
    
    return basicConcepts;
  }

  /**
   * Safe conversation context retrieval
   */
  async safeGetConversationContext(conversationId) {
    try {
      return await Promise.race([
        Promise.resolve(this.conversationTracker.getConversationContext(conversationId)),
        this.createTimeoutPromise(1000, 'Conversation context retrieval timed out')
      ]);
    } catch (error) {
      logger.warn('Failed to get conversation context:', error.message);
      return null;
    }
  }

  /**
   * Safe relevance score calculation with comprehensive error handling
   */
  async calculateEnhancedRelevanceScoresSafe(params) {
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
    
    // Get mode patterns safely
    const prioritySignals = await this.safeModePatterns(taskMode);
    
    // Process files with individual error handling
    const filePromises = projectFiles.map(file => 
      this.processFileSafely(file, {
        taskType,
        taskMode,
        currentFile,
        taskDescription,
        queryAnalysis,
        conversationContext,
        progressiveLevel,
        prioritySignals
      })
    );
    
    // Wait for all files to be processed, collecting results and errors
    const results = await Promise.allSettled(filePromises);
    
    let successCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { file, score, confidence, reasons } = result.value;
        scores.set(file.path, { score, confidence, reasons });
        successCount++;
      } else {
        logger.warn(`Failed to process file ${projectFiles[index]?.path}:`, result.reason.message);
        errorCount++;
      }
    });
    
    logger.info(`Processed ${successCount} files successfully, ${errorCount} failed`);
    
    return scores;
  }

  /**
   * Process individual file with complete error isolation
   */
  async processFileSafely(file, params) {
    const {
      taskType,
      taskMode,
      currentFile,
      taskDescription,
      queryAnalysis,
      conversationContext,
      progressiveLevel,
      prioritySignals
    } = params;
    
    let score = 0.1;
    let confidence = 0.5;
    const reasons = [];

    try {
      // Skip files already viewed in conversation (if configured)
      if (conversationContext && conversationContext.filesViewed.includes(file.path)) {
        if (progressiveLevel === 1) {
          return { file, score: 0, confidence: 0, reasons: ['Skipped - already viewed'] };
        } else {
          score *= 0.5;
          reasons.push('Already viewed in conversation');
        }
      }

      // Safe semantic similarity calculation
      try {
        const semanticSimilarity = await Promise.race([
          Promise.resolve(this.semanticSearch.calculateSemanticSimilarity(queryAnalysis, file)),
          this.createTimeoutPromise(1000, 'Semantic similarity timed out')
        ]);
        
        if (semanticSimilarity > 0) {
          score += semanticSimilarity * 0.25;
          confidence += 0.1;
          reasons.push(`Semantic match (${(semanticSimilarity * 100).toFixed(0)}%)`);
        }
      } catch (error) {
        // Use basic text matching as fallback
        const basicMatch = this.calculateBasicTextMatch(taskDescription, file);
        if (basicMatch > 0) {
          score += basicMatch * 0.15;
          reasons.push('Basic text match (fallback)');
        }
      }

      // Safe historical relevance
      try {
        const historicalScore = await this.safeGetHistoricalRelevance(file.path, taskType, taskMode);
        if (historicalScore.score > 0.5) {
          score += historicalScore.score * 0.2;
          confidence = Math.max(confidence, historicalScore.confidence);
          reasons.push(`Historical relevance (${(historicalScore.score * 100).toFixed(0)}%)`);
        }
      } catch (error) {
        logger.debug('Historical relevance failed for', file.path, error.message);
      }

      // Task mode specific scoring with safe git operations
      if (taskMode === 'debug') {
        try {
          const isRecent = await Promise.race([
            this.gitAnalyzer.hasRecentChanges(file.path, 48),
            this.createTimeoutPromise(this.gitTimeout, 'Git recent changes check timed out')
          ]);
          
          if (isRecent) {
            score += 0.3;
            reasons.push('Recently modified');
          }
        } catch (error) {
          // Fallback: check file modification time
          try {
            const stats = require('fs').statSync(path.join(this.projectRoot, file.path));
            const age = Date.now() - stats.mtime.getTime();
            if (age < 48 * 60 * 60 * 1000) { // 48 hours
              score += 0.2;
              reasons.push('Recently modified (fallback)');
            }
          } catch (fsError) {
            // Ignore file system errors
          }
        }
        
        // Simple path-based debug scoring
        if (file.path.includes('error') || file.path.includes('exception')) {
          score += 0.2;
          reasons.push('Error-related file');
        }
      }

      // Additional safety checks and scoring
      score = Math.min(score, 1.0);
      confidence = Math.min(confidence, 1.0);
      
      return { file, score, confidence, reasons };

    } catch (error) {
      logger.warn(`Error processing file ${file.path}:`, error.message);
      
      // Return minimal safe result
      return { 
        file, 
        score: 0.1, 
        confidence: 0.1, 
        reasons: ['Processing failed - using minimal score'] 
      };
    }
  }

  /**
   * Calculate basic text matching as fallback
   */
  calculateBasicTextMatch(taskDescription, file) {
    const taskWords = taskDescription.toLowerCase().split(/\s+/);
    const filePath = file.path.toLowerCase();
    const fileName = path.basename(filePath);
    
    let matches = 0;
    
    for (const word of taskWords) {
      if (filePath.includes(word)) matches += 0.3;
      if (fileName.includes(word)) matches += 0.5;
    }
    
    return Math.min(matches, 1.0);
  }

  /**
   * Safe mode patterns retrieval
   */
  async safeModePatterns(taskMode) {
    try {
      return await Promise.race([
        this.getModePatterns(taskMode),
        this.createTimeoutPromise(this.dbQueryTimeout, 'Mode patterns query timed out')
      ]);
    } catch (error) {
      logger.warn('Failed to get mode patterns:', error.message);
      return {}; // Return empty patterns as fallback
    }
  }

  /**
   * Safe database query for mode patterns
   */
  async getModePatterns(taskMode) {
    return new Promise((resolve, reject) => {
      try {
        const modePattern = db.prepare(
          'SELECT * FROM task_mode_patterns WHERE task_mode = ?'
        ).get(taskMode);
        
        const prioritySignals = modePattern && modePattern.priority_signals ? 
          JSON.parse(modePattern.priority_signals) : {};
          
        resolve(prioritySignals);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Safe historical relevance retrieval
   */
  async safeGetHistoricalRelevance(filePath, taskType, taskMode) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Historical relevance query timed out'));
      }, this.dbQueryTimeout);
      
      try {
        const query = db.prepare(`
          SELECT relevance_score, confidence 
          FROM file_relevance 
          WHERE file_path = ? AND task_type = ? AND task_mode = ?
        `);
        
        const result = query.get(filePath, taskType, taskMode);
        clearTimeout(timeout);
        resolve(result || { score: 0.5, confidence: 0.5 });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Safe context usage recording
   */
  async safeRecordContextUsage(params) {
    try {
      return await Promise.race([
        this.recordContextUsage(params),
        this.createTimeoutPromise(2000, 'Context usage recording timed out')
      ]);
    } catch (error) {
      logger.warn('Failed to record context usage:', error.message);
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Create fallback context when main processing fails
   */
  createFallbackContext(params, error) {
    const { projectFiles = [], targetTokens = 6000 } = params;
    
    logger.warn('Using fallback context due to error:', error.message);
    
    // Return simple context with basic file selection
    const basicFiles = projectFiles.slice(0, 3).map(file => ({
      path: file.path,
      confidence: 0.3,
      reasoning: ['Fallback selection'],
      tokens: Math.min(file.size || 1000, targetTokens / 3)
    }));
    
    return {
      included: basicFiles,
      excluded: projectFiles.slice(3).map(file => ({
        path: file.path,
        reason: 'Excluded due to processing error'
      })),
      totalTokens: basicFiles.reduce((sum, f) => sum + f.tokens, 0),
      taskMode: 'feature',
      sessionId: `fallback-${Date.now()}`,
      error: error.message,
      fallback: true
    };
  }

  /**
   * Cache management
   */
  generateCacheKey(params) {
    const { task, currentFile, targetTokens, progressiveLevel } = params;
    return `${task}-${currentFile || 'none'}-${targetTokens}-${progressiveLevel}`;
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Existing methods with minimal changes for compatibility
  classifyTask(task) {
    return this.detectTaskMode(task);
  }

  detectTaskMode(task, queryAnalysis = null) {
    if (!task || typeof task !== 'string') return 'feature';
    
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('bug') || taskLower.includes('fix') || taskLower.includes('debug') || 
        taskLower.includes('error') || taskLower.includes('issue')) {
      return 'debug';
    } else if (taskLower.includes('refactor') || taskLower.includes('restructure') || 
               taskLower.includes('reorganize') || taskLower.includes('clean')) {
      return 'refactor';
    } else {
      return 'feature';
    }
  }

  buildOptimalContext({ fileScores, targetTokens, currentFile, conversationId, minRelevanceScore = 0.15 }) {
    const sortedFiles = Array.from(fileScores.entries())
      .sort((a, b) => b[1].score - a[1].score);

    const included = [];
    const excluded = [];
    let currentTokens = 0;

    for (const [filePath, scoreData] of sortedFiles) {
      if (scoreData.score < minRelevanceScore) {
        excluded.push({
          path: filePath,
          reason: `Low relevance score (${scoreData.score.toFixed(2)})`
        });
        continue;
      }

      const estimatedTokens = this.estimateTokens(filePath);
      
      if (currentTokens + estimatedTokens <= targetTokens) {
        included.push({
          path: filePath,
          confidence: scoreData.confidence,
          reasoning: scoreData.reasons,
          tokens: estimatedTokens
        });
        currentTokens += estimatedTokens;
      } else {
        excluded.push({
          path: filePath,
          reason: 'Token budget exceeded'
        });
      }
    }

    return {
      included,
      excluded,
      totalTokens: currentTokens,
      targetTokens,
      utilizationRate: (currentTokens / targetTokens * 100).toFixed(1) + '%'
    };
  }

  estimateTokens(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      const content = readFileSync(fullPath, 'utf-8');
      return encode(content).length;
    } catch (error) {
      // Fallback estimation
      return 1000;
    }
  }

  recordContextUsage(params) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const stmt = db.prepare(`
        INSERT INTO context_sessions 
        (conversation_id, task_type, task_mode, task_description, included_files, confidence_scores, model_used) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        params.conversationId,
        params.taskType,
        params.taskMode,
        params.task,
        JSON.stringify(params.includedFiles),
        JSON.stringify(params.confidenceScores),
        params.model
      );
      
      return sessionId;
    } catch (error) {
      logger.warn('Failed to record context usage:', error.message);
      return sessionId; // Return session ID anyway
    }
  }

  // Additional methods for compatibility
  async recordSessionOutcome(params) {
    try {
      return await this.safeRecordSessionOutcome(params);
    } catch (error) {
      logger.warn('Failed to record session outcome:', error.message);
      return false;
    }
  }

  async safeRecordSessionOutcome(params) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Session outcome recording timed out'));
      }, this.dbQueryTimeout);
      
      try {
        const stmt = db.prepare(`
          UPDATE context_sessions 
          SET outcome_success = ?, files_actually_used = ? 
          WHERE id = ?
        `);
        
        stmt.run(
          params.wasSuccessful ? 1 : 0,
          JSON.stringify(params.filesActuallyUsed || []),
          params.sessionId
        );
        
        clearTimeout(timeout);
        resolve(true);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
}