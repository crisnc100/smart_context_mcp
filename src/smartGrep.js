/**
 * Smart Grep Integration - Enhances grep with intelligent context
 * This module provides methods to generate optimized grep commands based on query analysis
 */

// Common programming concepts mapped to search patterns
const CONCEPT_PATTERNS = {
  authentication: {
    primary: ['login|logout|auth|authenticate', 'token|session|jwt', 'currentUser|isAuthenticated'],
    secondary: ['password|credentials', 'verify|validate', 'permission|role|access'],
    description: 'Authentication and authorization patterns'
  },
  
  cart: {
    primary: ['cart|Cart', 'addToCart|removeFromCart|updateCart', 'cartItems|cartTotal|getTotalPrice'],
    secondary: ['price|total|subtotal', 'quantity|checkout', 'clearCart|emptyCart'],
    description: 'Shopping cart functionality patterns'
  },
  
  api: {
    primary: ['fetch|axios|request', 'API|endpoint|url', 'GET|POST|PUT|DELETE'],
    secondary: ['response|data|error', 'headers|body|params', 'async|await|then'],
    description: 'API calls and HTTP requests'
  },
  
  state: {
    primary: ['useState|setState|state', 'useReducer|dispatch|action', 'context|provider|consumer'],
    secondary: ['initialState|defaultState', 'updateState|modifyState', 'globalState|localState'],
    description: 'State management patterns'
  },
  
  database: {
    primary: ['query|select|insert|update|delete', 'model|schema|collection', 'find|save|remove'],
    secondary: ['connection|connect|disconnect', 'transaction|commit|rollback', 'index|relation'],
    description: 'Database operations and queries'
  },
  
  error: {
    primary: ['error|exception|throw', 'try|catch|finally', 'null|undefined|NaN'],
    secondary: ['validate|check|verify', 'handle|process|recover', 'log|console|debug'],
    description: 'Error handling and debugging'
  },
  
  routing: {
    primary: ['route|router|routing', 'path|url|link', 'navigate|redirect|push'],
    secondary: ['params|query|hash', 'history|location', 'middleware|guard'],
    description: 'Routing and navigation'
  },
  
  form: {
    primary: ['form|input|field', 'submit|validate|reset', 'onChange|onSubmit|handle'],
    secondary: ['value|checked|selected', 'validation|required|pattern', 'formData|formState'],
    description: 'Form handling and validation'
  },
  
  // Additional common patterns for better coverage
  user: {
    primary: ['user|User', 'profile|account', 'username|email'],
    secondary: ['settings|preferences', 'avatar|photo', 'role|permission'],
    description: 'User-related patterns'
  },
  
  product: {
    primary: ['product|Product', 'item|Item', 'inventory|stock'],
    secondary: ['price|cost', 'description|details', 'category|type'],
    description: 'Product and inventory patterns'
  },
  
  payment: {
    primary: ['payment|Payment', 'checkout|charge', 'stripe|paypal'],
    secondary: ['card|credit', 'billing|invoice', 'transaction|receipt'],
    description: 'Payment processing patterns'
  }
};

// Task-based search strategies
const TASK_STRATEGIES = {
  understand: {
    flags: '-n -C 3',
    approach: 'Show code with context to understand implementation',
    prioritize: ['definition', 'usage', 'tests']
  },
  
  debug: {
    flags: '-n -C 5',
    approach: 'Extended context to trace error sources',
    prioritize: ['error_handling', 'calculations', 'state_changes']
  },
  
  implement: {
    flags: '-n -B 2 -A 2',
    approach: 'Find similar patterns to use as templates',
    prioritize: ['similar_features', 'interfaces', 'utilities']
  },
  
  refactor: {
    flags: '-n -c',
    approach: 'Count occurrences and find all usages',
    prioritize: ['all_usages', 'imports', 'exports']
  },
  
  review: {
    flags: '-n -C 10',
    approach: 'Large context for comprehensive review',
    prioritize: ['changes', 'dependencies', 'side_effects']
  }
};

class SmartGrep {
  constructor(contextAnalyzer, fileScanner) {
    this.contextAnalyzer = contextAnalyzer;
    this.fileScanner = fileScanner;
  }

  /**
   * Analyzes query and generates optimized grep command
   */
  async getGrepStrategy(query, options = {}) {
    const {
      maxFiles = 5,
      includeContext = true,
      projectRoot = process.cwd()
    } = options;

    // Analyze query intent
    const intent = this.analyzeQueryIntent(query);
    
    // Get relevant files from smart-context
    let relevantFiles = [];
    try {
      // Try to get files from context analyzer if available
      if (this.contextAnalyzer && this.contextAnalyzer.findRelevantFiles) {
        relevantFiles = await this.contextAnalyzer.findRelevantFiles(query, maxFiles);
      } else if (this.fileScanner) {
        // Fallback to file scanner
        const allFiles = await this.fileScanner.scanCodebase();
        relevantFiles = allFiles.slice(0, maxFiles).map(f => ({
          path: f.path,
          relevance: 0.5
        }));
      }
    } catch (error) {
      // If file discovery fails, continue with empty array
      relevantFiles = [];
    }
    
    // Generate search patterns based on concepts
    const patterns = this.generateSearchPatterns(query, intent.concepts);
    
    // Build grep command
    const command = this.buildGrepCommand({
      patterns: patterns.primary,
      files: relevantFiles.map(f => f.path),
      flags: intent.strategy.flags,
      includeContext
    });

    return {
      command,
      files: relevantFiles,
      patterns: {
        primary: patterns.primary,
        secondary: patterns.secondary,
        explanation: patterns.explanation
      },
      strategy: {
        intent: intent.type,
        approach: intent.strategy.approach,
        concepts: intent.concepts
      },
      alternativeCommands: this.generateAlternatives(patterns, relevantFiles, intent)
    };
  }

  /**
   * Analyzes query to determine intent and relevant concepts
   */
  analyzeQueryIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    // Determine task type
    let taskType = 'understand'; // default
    if (lowerQuery.includes('bug') || lowerQuery.includes('error') || lowerQuery.includes('nan')) {
      taskType = 'debug';
    } else if (lowerQuery.includes('add') || lowerQuery.includes('implement') || lowerQuery.includes('create')) {
      taskType = 'implement';
    } else if (lowerQuery.includes('refactor') || lowerQuery.includes('rename') || lowerQuery.includes('move')) {
      taskType = 'refactor';
    } else if (lowerQuery.includes('review') || lowerQuery.includes('check') || lowerQuery.includes('audit')) {
      taskType = 'review';
    }

    // Identify concepts mentioned - improved detection
    const concepts = [];
    const queryWords = lowerQuery.split(/\s+/);
    
    for (const [concept, patterns] of Object.entries(CONCEPT_PATTERNS)) {
      // Check if concept name is in query
      if (lowerQuery.includes(concept)) {
        concepts.push(concept);
        continue;
      }
      
      // Check if any primary pattern keyword matches
      for (const pattern of patterns.primary) {
        const keywords = pattern.toLowerCase().split('|');
        if (keywords.some(keyword => queryWords.some(word => word.includes(keyword.replace(/\W/g, ''))))) {
          concepts.push(concept);
          break;
        }
      }
    }

    return {
      type: taskType,
      strategy: TASK_STRATEGIES[taskType],
      concepts,
      originalQuery: query
    };
  }

  /**
   * Generates search patterns based on identified concepts
   */
  generateSearchPatterns(query, concepts) {
    const patterns = {
      primary: [],
      secondary: [],
      explanation: []
    };

    // Add concept-specific patterns
    for (const concept of concepts) {
      if (CONCEPT_PATTERNS[concept]) {
        patterns.primary.push(...CONCEPT_PATTERNS[concept].primary);
        patterns.secondary.push(...CONCEPT_PATTERNS[concept].secondary);
        patterns.explanation.push(CONCEPT_PATTERNS[concept].description);
      }
    }

    // Extract potential identifiers from query
    const identifiers = this.extractIdentifiers(query);
    if (identifiers.length > 0) {
      patterns.primary.unshift(identifiers.join('|'));
      patterns.explanation.unshift('Direct identifiers from query');
    }

    // Remove duplicates
    patterns.primary = [...new Set(patterns.primary)];
    patterns.secondary = [...new Set(patterns.secondary)];

    return patterns;
  }

  /**
   * Extracts potential code identifiers from query
   */
  extractIdentifiers(query) {
    // Look for camelCase, PascalCase, snake_case identifiers
    const identifierPattern = /\b([a-z]+(?:[A-Z][a-z]+)*|[A-Z][a-z]+(?:[A-Z][a-z]+)*|[a-z]+(?:_[a-z]+)+)\b/g;
    const matches = query.match(identifierPattern) || [];
    
    // Filter out common English words
    const commonWords = ['the', 'how', 'what', 'where', 'when', 'why', 'does', 'work', 'find', 'show'];
    return matches.filter(m => !commonWords.includes(m.toLowerCase()));
  }

  /**
   * Builds the actual grep command
   */
  buildGrepCommand({ patterns, files, flags, includeContext }) {
    const pattern = patterns[0]; // Use primary pattern
    const fileList = files.slice(0, 5).join(' '); // Limit to 5 files
    
    // Build command
    let command = `grep ${flags}`;
    
    // Add pattern
    command += ` '${pattern}'`;
    
    // Add files
    if (fileList) {
      command += ` ${fileList}`;
    } else {
      command += ' .'; // Search current directory if no specific files
    }
    
    return command;
  }

  /**
   * Generates alternative grep commands for different approaches
   */
  generateAlternatives(patterns, files, intent) {
    const alternatives = [];

    // Case-insensitive search
    if (patterns.primary.length > 0 && files.length > 0) {
      const fileList = files.slice(0, 3).map(f => f.path).join(' ');
      alternatives.push({
        command: `grep -i -n '${patterns.primary[0]}' ${fileList || '.'}`,
        description: 'Case-insensitive search in top files'
      });
    } else if (patterns.primary.length > 0) {
      alternatives.push({
        command: `grep -i -r -n '${patterns.primary[0]}' .`,
        description: 'Case-insensitive search in all files'
      });
    }

    // Search all files with count
    alternatives.push({
      command: `grep -r -c '${patterns.primary[0] || 'pattern'}' . | grep -v ':0$'`,
      description: 'Count occurrences across all files'
    });

    // Extended regex search
    if (patterns.secondary.length > 0) {
      alternatives.push({
        command: `grep -E -n '${patterns.primary[0]}|${patterns.secondary[0]}' ${files[0]?.path || '.'}`,
        description: 'Extended search with secondary patterns'
      });
    }

    // File name search
    alternatives.push({
      command: `find . -name "*${intent.concepts[0] || 'pattern'}*" -type f`,
      description: 'Find files by name pattern'
    });

    return alternatives;
  }

  /**
   * Learns from successful searches to improve future suggestions
   */
  async recordSearchSuccess({ query, usedPattern, successfulFiles, foundContent }) {
    // Store successful pattern associations
    await this.contextAnalyzer.learning.recordPatternSuccess({
      query,
      pattern: usedPattern,
      files: successfulFiles,
      context: foundContent
    });
  }

  /**
   * Suggests next search based on current results
   */
  suggestNextSearch(currentResults, originalQuery) {
    // Analyze what was found
    const foundConcepts = this.analyzeResults(currentResults);
    
    // Suggest follow-up searches
    const suggestions = [];
    
    if (foundConcepts.includes('function_definition')) {
      suggestions.push({
        pattern: 'function_name\\(',
        reason: 'Find where this function is called'
      });
    }
    
    if (foundConcepts.includes('import_statement')) {
      suggestions.push({
        pattern: 'from.*import|require',
        reason: 'Find related imports'
      });
    }
    
    return suggestions;
  }

  /**
   * Analyzes grep results to identify what was found
   */
  analyzeResults(results) {
    const concepts = [];
    
    if (results.includes('function') || results.includes('const.*=.*=>')) {
      concepts.push('function_definition');
    }
    
    if (results.includes('import') || results.includes('require')) {
      concepts.push('import_statement');
    }
    
    if (results.includes('class') || results.includes('extends')) {
      concepts.push('class_definition');
    }
    
    return concepts;
  }
}

// Export for use in smart-context MCP
export { SmartGrep, CONCEPT_PATTERNS, TASK_STRATEGIES };