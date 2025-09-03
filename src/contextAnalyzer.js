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