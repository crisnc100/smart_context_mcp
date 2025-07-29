// Query Enhancer - Adds missing context to user queries

export class QueryEnhancer {
  constructor() {
    // Common patterns users omit but mean
    this.codePatterns = {
      // When user says "X naming" they often mean functions that create/format X
      naming: ['construct', 'format', 'build', 'create', 'get', 'generate'],
      
      // When user says "X validation" they mean
      validation: ['validate', 'check', 'verify', 'is', 'has', 'ensure'],
      
      // When user says "X handling" they mean
      handling: ['handle', 'process', 'manage', 'controller', 'service'],
      
      // Common file patterns
      formatting: ['formatter', 'format', 'utils', 'helpers', 'transform'],
      api: ['service', 'api', 'client', 'fetch', 'request', 'endpoint'],
      state: ['store', 'reducer', 'context', 'state', 'provider'],
      auth: ['auth', 'login', 'session', 'token', 'permission'],
    };

    // Function name patterns by intent
    this.functionPatterns = {
      create: /(?:create|make|build|construct|new|init|generate)(\w+)/gi,
      read: /(?:get|fetch|find|load|read|retrieve|query|select)(\w+)/gi,
      update: /(?:update|set|modify|change|edit|patch|save)(\w+)/gi,
      delete: /(?:delete|remove|destroy|clear|reset)(\w+)/gi,
      format: /(?:format|transform|convert|parse|serialize)(\w+)/gi,
      validate: /(?:validate|check|verify|is|has|ensure)(\w+)/gi,
    };
  }

  enhanceQuery(originalQuery) {
    const query = originalQuery.toLowerCase();
    const enhanced = {
      original: originalQuery,
      expanded: [],
      concepts: [],
      patterns: [],
      fileHints: [],
      functionHints: []
    };

    // Extract key concepts
    const words = query.split(/\s+/);
    
    // Look for action words that suggest code patterns
    for (const word of words) {
      // Check if word matches any pattern category
      for (const [category, patterns] of Object.entries(this.codePatterns)) {
        if (word.includes(category) || category.includes(word)) {
          enhanced.patterns.push(...patterns);
          enhanced.fileHints.push(category);
        }
      }
    }

    // Handle camelCase in query (user might type "exerciseName" or "formatName")
    const camelCaseWords = query.match(/[a-z]+[A-Z][a-zA-Z]*/g) || [];
    for (const camelWord of camelCaseWords) {
      const expanded = this.expandCamelCase(camelWord);
      enhanced.expanded.push(expanded);
      enhanced.concepts.push(...expanded.split(' '));
    }

    // Infer likely function names
    if (query.includes('naming') || query.includes('format')) {
      enhanced.functionHints.push(
        'formatName', 'getName', 'constructName', 
        'buildName', 'createName', 'nameFormatter'
      );
    }

    // Add common code suffixes
    const baseWords = words.filter(w => w.length > 3);
    for (const base of baseWords) {
      enhanced.functionHints.push(
        `${base}Formatter`,
        `format${this.capitalize(base)}`,
        `get${this.capitalize(base)}`,
        `${base}Utils`,
        `${base}Helper`
      );
    }

    return enhanced;
  }

  expandCamelCase(text) {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .toLowerCase();
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Suggest better queries based on what we find
  suggestBetterQueries(originalQuery, filesFound) {
    const suggestions = [];
    
    // If we found files with certain patterns, suggest more specific queries
    const hasFormatters = filesFound.some(f => f.path.includes('format'));
    const hasUtils = filesFound.some(f => f.path.includes('util'));
    
    if (hasFormatters) {
      suggestions.push(`${originalQuery} formatter functions`);
    }
    
    if (hasUtils) {
      suggestions.push(`${originalQuery} utility helpers`);
    }
    
    // Suggest function-specific queries
    const words = originalQuery.split(' ');
    const mainConcept = words.find(w => w.length > 4) || words[0];
    suggestions.push(
      `format${this.capitalize(mainConcept)} function`,
      `${mainConcept} transformation logic`
    );
    
    return suggestions;
  }
}

export default QueryEnhancer;