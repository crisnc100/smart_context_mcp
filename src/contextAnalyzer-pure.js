import { db } from './database-sqljs.js';
import { encode } from 'gpt-tokenizer';
import { readFileSync } from 'fs';
import path from 'path';
import { SemanticSearch } from './semanticSearch.js';
import { ConversationTracker } from './conversationTracker.js';
import { GitAnalyzer } from './gitAnalyzer.js';
import config from './config.js';
import logger from './logger.js';

export class ContextAnalyzer {
  constructor(projectRoot) {
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
      targetTokens = config.get('context.defaultTokenBudget', 6000),
      model = 'claude-3-opus',
      projectFiles = [],
      conversationId = null,
      progressiveLevel = 1,
      minRelevanceScore = config.get('context.minRelevanceScore', 0.3)
    } = params;

    const queryAnalysis = this.semanticSearch.analyzeQuery(task);
    const taskType = this.classifyTask(task);
    const taskMode = this.detectTaskMode(task, queryAnalysis);
    
    const conversationContext = conversationId ? 
      this.conversationTracker.getConversationContext(conversationId) : null;
    
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

    const context = this.buildOptimalContext({
      fileScores,
      targetTokens,
      currentFile,
      conversationId,
      minRelevanceScore
    });

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

  countTokens(text) {
    try {
      // Use gpt-tokenizer for pure JS token counting
      return encode(text).length;
    } catch {
      // Fallback estimation
      return Math.ceil(text.length / 4);
    }
  }

  // All other methods remain the same as in the original contextAnalyzer.js
  detectTaskMode(task, queryAnalysis) {
    const modePatterns = db.prepare(
      'SELECT * FROM task_mode_patterns'
    ).all();

    let bestMode = 'general';
    let highestScore = 0;

    for (const pattern of modePatterns) {
      const keywords = JSON.parse(pattern.common_keywords);
      let score = 0;

      for (const keyword of keywords) {
        if (task.toLowerCase().includes(keyword)) {
          score += 0.2;
        }
      }

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
    
    const modePattern = db.prepare(
      'SELECT * FROM task_mode_patterns WHERE task_mode = ?'
    ).get(taskMode);
    
    const prioritySignals = modePattern && modePattern.priority_signals ? 
      JSON.parse(modePattern.priority_signals) : {};

    for (const file of projectFiles) {
      let score = 0.1;
      let confidence = 0.5;
      const reasons = [];

      if (conversationContext && conversationContext.filesViewed.includes(file.path)) {
        if (progressiveLevel === 1) {
          continue;
        } else {
          score *= 0.5;
          reasons.push('Already viewed in conversation');
        }
      }

      const semanticSimilarity = this.semanticSearch.calculateSemanticSimilarity(
        queryAnalysis, 
        file
      );
      if (semanticSimilarity > 0) {
        score += semanticSimilarity * 0.25;
        confidence += 0.1;
        reasons.push(`Semantic match (${(semanticSimilarity * 100).toFixed(0)}%)`);
      }

      const historicalScore = this.getHistoricalRelevance(file.path, taskType, taskMode);
      if (historicalScore.score > 0.5) {
        score += historicalScore.score * 0.2;
        confidence = Math.max(confidence, historicalScore.confidence);
        reasons.push(`Historical relevance (${(historicalScore.score * 100).toFixed(0)}%)`);
      }

      if (taskMode === 'debug') {
        const isRecent = await this.gitAnalyzer.hasRecentChanges(file.path, 48);
        if (isRecent) {
          score += 0.3;
          reasons.push('Recently modified');
        }
        
        if (file.path.includes('error') || file.path.includes('exception')) {
          score += 0.2;
          reasons.push('Error handling file');
        }
      } else if (taskMode === 'feature') {
        if (this.isSimilarFeature(file.path, queryAnalysis.concepts)) {
          score += 0.3;
          reasons.push('Similar feature pattern');
        }
      } else if (taskMode === 'refactor') {
        if (this.hasImportRelationship(currentFile, file.path, projectFiles)) {
          score += 0.4;
          reasons.push('Direct dependency');
        }
      }

      if (this.hasImportRelationship(currentFile, file.path, projectFiles)) {
        score += 0.25;
        reasons.push('Import relationship');
      }

      const coChangeScore = await this.getGitCoChangeScore(currentFile, file.path);
      if (coChangeScore > 0) {
        score += coChangeScore * 0.15;
        reasons.push(`Frequently changed together (${(coChangeScore * 100).toFixed(0)}%)`);
      }

      // Only calculate path similarity if currentFile is provided
      if (currentFile) {
        const pathSimilarity = this.calculatePathSimilarity(currentFile, file.path);
        if (pathSimilarity > 0.5) {
          score += pathSimilarity * 0.1;
          reasons.push('Same directory/feature');
        }
      }

      if (progressiveLevel === 1 && score < 0.6) {
        continue;
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

  buildOptimalContext({ fileScores, targetTokens, currentFile, conversationId, minRelevanceScore = 0.15 }) {
    const sortedFiles = Array.from(fileScores.entries())
      .sort((a, b) => b[1].score - a[1].score);

    const included = [];
    const excluded = [];
    let totalTokens = 0;

    // First pass: Include files meeting criteria
    for (const [filePath, scoreData] of sortedFiles) {
      const fileContent = this.getFileContent(filePath);
      const tokens = this.countTokens(fileContent);

      if (filePath === currentFile || 
          (totalTokens + tokens <= targetTokens && scoreData.score > minRelevanceScore)) {
        included.push({
          path: filePath,
          score: scoreData.score,
          confidence: scoreData.confidence,
          tokens,
          reasons: scoreData.reasons,
          content: fileContent
        });
        totalTokens += tokens;

        if (conversationId) {
          this.conversationTracker.markFileViewed(conversationId, filePath);
        }
      } else {
        excluded.push({
          path: filePath,
          score: scoreData.score,
          reasons: totalTokens + tokens > targetTokens ? 
            ['Token budget exceeded'] : [`Score ${scoreData.score.toFixed(2)} below threshold ${minRelevanceScore}`]
        });
      }
    }

    // CRITICAL: Never return empty results if we have files
    if (included.length === 0 && sortedFiles.length > 0) {
      // Include at least top 5 files regardless of score
      const topFiles = sortedFiles.slice(0, 5);
      included.push({
        path: '⚠️ Low Relevance Results',
        score: 0,
        confidence: 0,
        tokens: 100,
        reasons: ['All files scored below threshold, showing top matches'],
        content: '// All files scored below the relevance threshold.\\n// Showing top 5 matches anyway:\\n'
      });
      
      for (const [filePath, scoreData] of topFiles) {
        const fileContent = this.getFileContent(filePath);
        const tokens = this.countTokens(fileContent);
        
        if (totalTokens + tokens <= targetTokens) {
          included.push({
            path: filePath,
            score: scoreData.score,
            confidence: scoreData.confidence,
            tokens,
            reasons: [...scoreData.reasons, 'Included despite low score'],
            content: fileContent
          });
          totalTokens += tokens;
        }
      }
    }

    return {
      included,
      excluded,
      totalTokens,
      tokenBudget: targetTokens,
      lowScoreWarning: included.some(f => f.path === '⚠️ Low Relevance Results')
    };
  }

  getFileContent(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      return readFileSync(fullPath, 'utf-8');
    } catch (error) {
      logger.error(`Error reading file ${filePath}:`, error);
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
    // Handle null/undefined paths
    if (!pathA || !pathB) {
      return 0;
    }
    
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
}