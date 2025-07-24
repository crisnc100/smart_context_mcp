import nlp from 'compromise';
import stopword from 'stopword';
import { db } from './database-sqljs.js';

export class SemanticSearch {
  constructor() {
    // Initialize compromise for NLP tasks
  }

  // Extract semantic meaning from query
  analyzeQuery(query) {
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