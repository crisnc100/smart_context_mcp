import nlp from 'compromise';
import stopword from 'stopword';
import { db } from './database-sqljs.js';
import { QueryEnhancer } from './queryEnhancer.js';

export class SemanticSearch {
  constructor() {
    this.queryEnhancer = new QueryEnhancer();
  }

  // Extract semantic meaning from query with code-specific enhancements
  analyzeQuery(query) {
    // First, enhance the query with code-specific patterns
    const enhanced = this.queryEnhancer.enhanceQuery(query);
    
    // Use compromise for NLP analysis
    const doc = nlp(query);
    
    // Tokenize and clean
    let tokens = query.toLowerCase().split(/\s+/);
    tokens = stopword.removeStopwords(tokens);
    
    // Get root forms using compromise
    const stemmed = tokens.map(token => {
      const word = nlp(token);
      return word.verbs().toInfinitive().text() || 
             word.nouns().toSingular().text() || 
             token;
    });
    
    // Extract concepts - combine NLP and code-specific
    const nlpConcepts = this.extractConcepts(query);
    const allConcepts = [...new Set([
      ...nlpConcepts,
      ...enhanced.concepts,
      ...enhanced.patterns
    ])];
    
    // Add function hints to tokens for better matching
    const enhancedTokens = [...new Set([
      ...tokens,
      ...enhanced.functionHints.map(f => f.toLowerCase())
    ])];
    
    // Detect intent
    const intent = this.detectIntent(query);
    
    return {
      original: query,
      tokens: enhancedTokens,
      stemmed,
      concepts: allConcepts,
      intent,
      entities: this.extractEntities(query),
      codePatterns: enhanced.patterns,
      functionHints: enhanced.functionHints,
      fileHints: enhanced.fileHints
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
    const filePath = fileData.path.toLowerCase();
    let similarity = 0;
    let matchReasons = [];

    // Check function hints (HIGHEST PRIORITY for code search)
    if (queryAnalysis.functionHints && fileData.functions) {
      for (const hint of queryAnalysis.functionHints) {
        const hintLower = hint.toLowerCase();
        // Check actual function names
        for (const func of fileData.functions) {
          if (func.toLowerCase().includes(hintLower) || hintLower.includes(func.toLowerCase())) {
            similarity += 0.4;
            matchReasons.push(`Function: ${func}`);
          }
        }
        // Check file content for function patterns
        if (fileContent.includes(hintLower)) {
          similarity += 0.2;
        }
      }
    }

    // File path pattern matching (formatter, utils, etc)
    if (queryAnalysis.fileHints) {
      for (const hint of queryAnalysis.fileHints) {
        if (filePath.includes(hint)) {
          similarity += 0.3;
          matchReasons.push(`File pattern: ${hint}`);
        }
      }
    }

    // Concept matching
    for (const concept of queryAnalysis.concepts) {
      if (fileContent.includes(concept)) {
        similarity += 0.15;
      }
    }

    // Token matching with stemming
    for (const token of queryAnalysis.tokens) {
      if (token.length > 3 && fileContent.includes(token)) {
        similarity += 0.1;
      }
    }

    // Entity matching (explicit function names in query)
    for (const func of queryAnalysis.entities.functions) {
      if (fileData.functions && fileData.functions.includes(func)) {
        similarity += 0.5;
        matchReasons.push(`Exact function: ${func}`);
      }
    }

    // File path matching
    for (const file of queryAnalysis.entities.files) {
      if (fileData.path.includes(file)) {
        similarity += 0.6;
        matchReasons.push(`File path: ${file}`);
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