/**
 * Enhancement to make existing smart-context methods grep-friendly
 * This should be integrated into the existing methods, not as a separate tool
 */

/**
 * Enhances the get_optimal_context response with grep commands
 * Add this to the existing get_optimal_context method
 */
function enhanceContextWithGrep(originalResponse, task) {
  // If we have ranked files, generate grep commands
  if (originalResponse.files && originalResponse.files.length > 0) {
    // Extract key terms from the task
    const keywords = extractKeywords(task);
    
    // Build grep pattern from keywords
    const pattern = keywords.join('|');
    
    // Get top 3 files
    const topFiles = originalResponse.files
      .slice(0, 3)
      .map(f => f.path)
      .join(' ');
    
    // Add grep suggestions to response
    originalResponse.grepCommands = {
      // Primary command with context
      primary: `grep -n -C 3 '${pattern}' ${topFiles}`,
      
      // Alternative searches
      alternatives: [
        `grep -l '${keywords[0]}' ${topFiles}`,  // List files containing first keyword
        `grep -n '${pattern}' ${originalResponse.files[0].path}`,  // Focus on top file
        `grep -r -n '${keywords[0]}' --include="*.js" .`  // Broader search
      ],
      
      // Explanation
      usage: "Run the primary command to see actual code in the ranked files"
    };
  }
  
  return originalResponse;
}

/**
 * Enhances search_codebase to include grep patterns
 * Add this to the existing search_codebase method
 */
function enhanceSearchWithGrep(searchResults, query) {
  if (searchResults.results && searchResults.results.length > 0) {
    // Analyze query for search patterns
    const patterns = generateSearchPatterns(query);
    
    // Get file list
    const fileList = searchResults.results
      .slice(0, 5)
      .map(r => r.file)
      .join(' ');
    
    // Add grep integration
    searchResults.grepIntegration = {
      // Suggested grep command
      command: `grep -n '${patterns.primary}' ${fileList}`,
      
      // Search patterns identified
      patterns: {
        primary: patterns.primary,
        secondary: patterns.secondary
      },
      
      // How to use with the results
      workflow: [
        "1. Note the ranked files from smart-context",
        "2. Run the grep command to see actual code",
        "3. Use secondary patterns if primary doesn't find what you need"
      ]
    };
  }
  
  return searchResults;
}

/**
 * Fix for get_file_relationships to actually return relationships
 * This should replace the current empty implementation
 */
function getActualFileRelationships(filePath, db) {
  const relationships = {
    imports: [],
    importedBy: [],
    similarFiles: [],
    coChangedFiles: []
  };
  
  // Get imports from this file
  const importsQuery = db.prepare(`
    SELECT target_file, relationship_type, strength 
    FROM file_relationships 
    WHERE source_file = ? 
    AND relationship_type IN ('imports', 'requires', 'includes')
  `).all(filePath);
  
  relationships.imports = importsQuery;
  
  // Get files that import this file
  const importedByQuery = db.prepare(`
    SELECT source_file, relationship_type, strength 
    FROM file_relationships 
    WHERE target_file = ? 
    AND relationship_type IN ('imports', 'requires', 'includes')
  `).all(filePath);
  
  relationships.importedBy = importedByQuery;
  
  // Add grep commands to explore relationships
  relationships.grepCommands = {
    findImports: `grep -n "import.*from.*'.*${filePath.split('/').pop().replace('.js', '')}'" --include="*.js" -r .`,
    findUsage: `grep -n "${filePath.split('/').pop().replace('.js', '').replace('Context', '').toLowerCase()}" --include="*.js" -r .`,
    findSimilar: `find . -name "*${filePath.split('/').pop().replace('.js', '')}*" -type f`
  };
  
  return relationships;
}

/**
 * Helper function to extract keywords from a task description
 */
function extractKeywords(task) {
  const commonWords = ['the', 'how', 'what', 'where', 'when', 'why', 'does', 'work', 'find', 'show', 'is', 'a', 'an'];
  
  // Extract potential code identifiers
  const words = task.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word));
  
  // Look for camelCase or snake_case
  const codePattern = /\b([a-z]+(?:[A-Z][a-z]+)*|[A-Z][a-z]+(?:[A-Z][a-z]+)*|[a-z]+(?:_[a-z]+)+)\b/g;
  const codeMatches = task.match(codePattern) || [];
  
  return [...new Set([...codeMatches, ...words])].slice(0, 5);
}

/**
 * Generate search patterns from a query
 */
function generateSearchPatterns(query) {
  const keywords = extractKeywords(query);
  
  // Build primary pattern from keywords
  const primary = keywords.slice(0, 3).join('|');
  
  // Build secondary patterns for broader search
  const secondary = keywords.slice(3, 5).join('|');
  
  return { primary, secondary };
}

/**
 * Integration points for existing methods
 */
const integrationGuide = {
  'get_optimal_context': {
    location: 'Around line 340 in index.js',
    change: 'After getting file list, call enhanceContextWithGrep(response, task)',
    benefit: 'Users get both ranked files AND grep commands to see the code'
  },
  
  'search_codebase': {
    location: 'Around line 450 in index.js',
    change: 'After search results, call enhanceSearchWithGrep(results, query)',
    benefit: 'Search results include grep patterns to explore the code'
  },
  
  'get_file_relationships': {
    location: 'Around line 550 in index.js',
    change: 'Replace empty array return with getActualFileRelationships(filePath, db)',
    benefit: 'Actually shows file relationships and grep commands to explore them'
  }
};

export {
  enhanceContextWithGrep,
  enhanceSearchWithGrep,
  getActualFileRelationships,
  integrationGuide
};