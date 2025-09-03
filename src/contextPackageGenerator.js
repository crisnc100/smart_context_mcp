/**
 * Context Package Generator - The heart of smart-context MCP pivot
 * Generates complete context packages for AI to understand and solve problems
 */

import { ContextAnalyzer } from './contextAnalyzer-pure.js';
import { SemanticSearch } from './semanticSearch.js';
import { GitAnalyzer } from './gitAnalyzer.js';
import { ContextLearning } from './learning.js';
import { ScopedFileScanner } from './fileScanner-scoped.js';

// Task-specific context templates
const CONTEXT_TEMPLATES = {
  debugging: {
    needs: ['error_message', 'stack_trace', 'recent_changes', 'data_flow'],
    sections: ['problem', 'coreImplementation', 'usage', 'dataFlow', 'checklist'],
    checklist: [
      'Check for null/undefined values',
      'Verify data types match expectations',
      'Look for async/await issues',
      'Check error boundaries',
      'Validate input parameters'
    ]
  },
  
  feature: {
    needs: ['requirements', 'similar_features', 'patterns_used', 'dependencies'],
    sections: ['requirements', 'similarImplementations', 'patterns', 'dependencies', 'testCases'],
    checklist: [
      'Define clear requirements',
      'Find similar existing features',
      'Identify required dependencies',
      'Plan test cases',
      'Consider edge cases'
    ]
  },
  
  refactoring: {
    needs: ['current_structure', 'dependencies', 'usage_points', 'tests'],
    sections: ['currentStructure', 'dependencies', 'usagePoints', 'impact', 'refactorPlan'],
    checklist: [
      'Map all usage points',
      'Identify breaking changes',
      'Plan incremental steps',
      'Update tests',
      'Create rollback plan'
    ]
  },
  
  review: {
    needs: ['changes_made', 'affected_systems', 'business_logic', 'tests'],
    sections: ['changes', 'impact', 'concerns', 'suggestions'],
    checklist: [
      'Security implications',
      'Performance impact',
      'Code standards compliance',
      'Test coverage',
      'Documentation updates'
    ]
  }
};

// Common error patterns and fixes
const ERROR_PATTERNS = {
  'NaN': {
    pattern: 'Result is NaN',
    causes: ['Division by zero', 'Parsing non-numeric strings', 'undefined in calculations'],
    fixes: ['Add parseFloat() or Number()', 'Check for null/undefined', 'Provide default values'],
    example: 'const value = parseFloat(input) || 0;'
  },
  
  'undefined': {
    pattern: 'Cannot read property of undefined',
    causes: ['Missing null checks', 'Async data not loaded', 'Wrong property path'],
    fixes: ['Add optional chaining ?.', 'Add null guards', 'Verify data structure'],
    example: 'const data = obj?.property?.nested || defaultValue;'
  },
  
  'null': {
    pattern: 'Value is null',
    causes: ['API returns null', 'State not initialized', 'Failed operations'],
    fixes: ['Initialize with defaults', 'Add null checks', 'Handle error cases'],
    example: 'const items = data?.items ?? [];'
  }
};

export class ContextPackageGenerator {
  constructor(projectRoot, db) {
    this.projectRoot = projectRoot;
    this.db = db;
    this.analyzer = new ContextAnalyzer(projectRoot, db);
    this.semanticSearch = new SemanticSearch();
    this.gitAnalyzer = new GitAnalyzer(projectRoot);
    this.learning = new ContextLearning(db);
    this.fileScanner = new ScopedFileScanner(projectRoot);
  }

  /**
   * Generate a complete context package for a query
   */
  async generateContextPackage(query, options = {}) {
    const {
      tokenBudget = 8000,
      taskMode = this.detectTaskMode(query),
      currentFile = null,
      conversationId = null
    } = options;
    
    // Token budget allocation (percentage of total)
    const budgetAllocation = {
      coreImplementation: 0.4,  // 40% for main code
      usage: 0.2,                // 20% for usage examples
      relationships: 0.15,       // 15% for dependencies
      dataFlow: 0.1,            // 10% for data flow
      checklist: 0.05,          // 5% for checklist
      metadata: 0.1             // 10% for other metadata
    };

    try {
      // Step 1: Understand the query
      const understanding = await this.understandQuery(query, taskMode);
      
      // Step 2: Find relevant files
      const relevantFiles = await this.findRelevantFiles(understanding, currentFile);
      
      // Step 3: Extract core implementation
      const coreImplementation = await this.extractCoreImplementation(
        understanding,
        relevantFiles,
        Math.floor(tokenBudget * budgetAllocation.coreImplementation)
      );
      
      // Step 4: Find usage patterns with token limit
      const usageTokenBudget = Math.floor(tokenBudget * budgetAllocation.usage);
      const usage = await this.findUsagePatterns(coreImplementation, relevantFiles, usageTokenBudget);
      
      // Step 5: Map relationships (use the core implementation file)
      const relationshipFile = coreImplementation?.file || relevantFiles[0]?.file || relevantFiles[0]?.path;
      const relationships = await this.mapRelationships(relationshipFile);
      
      // Step 6: Analyze data flow
      const dataFlow = await this.analyzeDataFlow(coreImplementation);
      
      // Step 7: Generate checklist
      const checklist = this.generateChecklist(understanding, taskMode);
      
      // Step 8: Suggest fixes
      const suggestedFix = this.suggestFix(understanding);
      
      // Step 9: Build complete package
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const contextPackage = {
        summary: {
          query: query,
          interpretation: understanding.interpretation,
          taskMode: taskMode,
          confidence: understanding.confidence || 0.7,
          timestamp: new Date().toISOString(),
          primaryFiles: relevantFiles.slice(0, 3).map(f => f.file || f.path)
        },
        
        understanding: {
          taskType: taskMode,
          problemDescription: understanding.problemDescription,
          concepts: understanding.concepts || [],
          entities: understanding.entities || [],
          errorType: understanding.errorType,
          hasError: understanding.hasError,
          rationale: understanding.rationale
        },
        
        context: {
          coreImplementation: coreImplementation,
          usage: usage,
          dataFlow: dataFlow,
          dependencies: relationships.dependencies || [],
          fallbackContext: null // Will be set if no core implementation
        },
        
        relationships: relationships,
        
        checklist: checklist,
        
        suggestedFix: suggestedFix,
        
        metadata: {
          tokenBudget: tokenBudget,
          approxTokens: 0, // Will be calculated after
          sessionId: sessionId,
          relevantFiles: relevantFiles.map(f => ({
            path: f.file || f.path,
            relevance: f.similarity || f.relevance || 0,
            reason: f.matchedConcepts ? `Matched: ${f.matchedConcepts.join(', ')}` : (f.reason || 'Related to query')
          })),
          conversationId: conversationId
        }
      };
      
      // Add fallback context if no core implementation found
      if (!contextPackage.context.coreImplementation || !contextPackage.context.coreImplementation.code) {
        contextPackage.context.fallbackContext = {
          message: 'No specific implementation found. Showing most relevant file sections.',
          files: relevantFiles.slice(0, 3).map(f => ({
            path: f.file || f.path,
            relevance: f.similarity || f.relevance || 0,
            preview: 'File content would be extracted here'
          }))
        };
      }
      
      // Calculate tokens after package is built
      contextPackage.metadata.approxTokens = this.estimateTokens(contextPackage);
      
      // Record for learning (stub for now)
      // if (conversationId) {
      //   await this.learning.recordContextGeneration(conversationId, query, contextPackage);
      // }
      
      return contextPackage;
      
    } catch (error) {
      console.error('Error generating context package:', error);
      return this.getFallbackPackage(query, error);
    }
  }

  /**
   * Understand the query intent and extract key information
   */
  async understandQuery(query, taskMode) {
    const analysis = this.semanticSearch.analyzeQuery(query);
    
    // Extract error indicators
    const errorKeywords = ['error', 'bug', 'crash', 'fail', 'NaN', 'undefined', 'null', 'broken'];
    const hasError = errorKeywords.some(keyword => query.toLowerCase().includes(keyword));
    
    // Extract specific error type
    let errorType = null;
    for (const [type, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (query.toLowerCase().includes(type.toLowerCase())) {
        errorType = type;
        break;
      }
    }
    
    return {
      interpretation: analysis.intent || 'understand',
      concepts: analysis.concepts || [],
      entities: analysis.entities || [],
      problemDescription: this.extractProblemDescription(query),
      rationale: this.generateRationale(analysis),
      errorType: errorType,
      hasError: hasError,
      confidence: this.calculateConfidence(analysis)
    };
  }

  /**
   * Find files relevant to the query
   */
  async findRelevantFiles(understanding, currentFile) {
    const files = await this.fileScanner.scanCodebase();
    
    // Create a query analysis object for semantic search
    const queryAnalysis = {
      tokens: understanding.problemDescription.toLowerCase().split(/\s+/),
      concepts: understanding.concepts,
      entities: understanding.entities,
      intent: understanding.interpretation
    };
    
    // Use semantic search to rank files
    let rankedFiles = await this.semanticSearch.findSimilarFiles(
      queryAnalysis,
      files,
      10
    );
    
    // Ensure we always have at least some files (fallback to first N files)
    if (rankedFiles.length === 0 && files.length > 0) {
      rankedFiles = files.slice(0, 5).map(f => ({
        file: f.path,
        similarity: 0.1,
        matchedConcepts: []
      }));
    }
    
    // Boost current file if provided
    if (currentFile) {
      const currentIndex = rankedFiles.findIndex(f => f.file === currentFile);
      if (currentIndex > 0) {
        const current = rankedFiles[currentIndex];
        rankedFiles.splice(currentIndex, 1);
        rankedFiles.unshift(current);
      } else if (currentIndex === -1) {
        // Current file not in results, add it at the beginning
        rankedFiles.unshift({
          file: currentFile,
          similarity: 0.8,
          matchedConcepts: ['current file']
        });
      }
    }
    
    // Add reasons for relevance
    return rankedFiles.map(f => ({
      path: f.file,
      relevance: f.similarity,
      reason: this.explainRelevance(f, understanding)
    }));
  }

  /**
   * Extract the core implementation related to the query
   */
  async extractCoreImplementation(understanding, relevantFiles, tokenLimit) {
    if (relevantFiles.length === 0) {
      return { location: 'Unknown', code: '', file: '' };
    }
    
    const primaryFile = relevantFiles[0];
    const path = await import('path');
    
    // Convert relative path to absolute
    const absolutePath = primaryFile.path.startsWith('/') 
      ? primaryFile.path 
      : path.join(this.projectRoot, primaryFile.path);
    
    // Find specific function/class if mentioned
    const targetFunction = await this.findTargetFunction(understanding, absolutePath);
    
    if (targetFunction) {
      let code = await this.extractFunctionCode(absolutePath, targetFunction);
      
      // Trim to token limit if needed
      code = this.trimToTokenLimit(code, tokenLimit);
      
      return {
        file: primaryFile.path,
        location: `${primaryFile.path}:${targetFunction.line}`,
        function: targetFunction.name,
        lines: `${targetFunction.startLine}-${targetFunction.endLine}`,
        code: code
      };
    }
    
    // Fall back to relevant section
    const section = await this.extractRelevantSection(absolutePath, understanding, tokenLimit);
    return {
      file: primaryFile.path,
      location: primaryFile.path,
      lines: section.lines,
      code: section.code
    };
  }

  /**
   * Find where the implementation is used
   */
  async findUsagePatterns(coreImplementation, relevantFiles, tokenLimit = 1000) {
    const usages = [];
    let totalChars = 0;
    const maxChars = tokenLimit * 4; // Roughly 4 chars per token
    
    if (!coreImplementation.function) {
      return usages;
    }
    
    // Search for function usage in relevant files
    const path = await import('path');
    for (const file of relevantFiles.slice(1, 4)) { // Check top 3 other files
      const absolutePath = path.isAbsolute(file.path) 
        ? file.path 
        : path.join(this.projectRoot, file.path);
      const usage = await this.findFunctionUsage(absolutePath, coreImplementation.function);
      if (usage) {
        // Check if we have room for this usage
        const usageLength = (usage.context || usage.code).length;
        if (totalChars + usageLength > maxChars) {
          // Trim or skip based on what we have
          if (usages.length === 0) {
            // First usage, must include something
            usage.context = this.trimToTokenLimit(usage.context, tokenLimit / 4);
          } else {
            // Skip additional usages if over budget
            break;
          }
        }
        
        usages.push({
          file: file.path,
          line: usage.line,
          code: usage.code,
          context: usage.context
        });
        
        totalChars += usageLength;
      }
    }
    
    return usages;
  }

  /**
   * Map relationships for a file
   */
  async mapRelationships(filePath) {
    if (!filePath) {
      return {
        dependencies: [],
        provides: [],
        usedBy: [],
        commonlyChangedWith: []
      };
    }
    
    // Normalize path to absolute
    const path = await import('path');
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.projectRoot, filePath);
    
    // Get imports and resolve to actual files
    const rawImports = await this.extractImports(absolutePath);
    const dependencies = await this.resolveImportsToFiles(rawImports, absolutePath);
    
    // Get exports
    const exports = await this.extractExports(absolutePath);
    
    // Get git co-change patterns from database
    const coChanged = await this.getCoChangePatterns(absolutePath);
    
    // Get test files
    const testFiles = await this.findTestFiles(absolutePath);
    
    // Find who uses this file
    const usedBy = await this.findConsumers(exports, absolutePath);
    
    return {
      dependencies: dependencies,
      provides: exports,
      usedBy: usedBy,
      commonlyChangedWith: coChanged,
      tests: testFiles
    };
  }

  /**
   * Analyze data flow in the code
   */
  async analyzeDataFlow(coreImplementation) {
    if (!coreImplementation.code) {
      return 'Unable to analyze data flow';
    }
    
    // Simple heuristic: extract variable assignments and operations
    const code = coreImplementation.code;
    const flow = [];
    
    // Find variable declarations and assignments
    const assignmentPattern = /(?:const|let|var)\s+(\w+)\s*=\s*([^;]+);/g;
    let match;
    
    while ((match = assignmentPattern.exec(code)) !== null) {
      flow.push(`${match[1]} ← ${match[2].trim()}`);
    }
    
    // Find return statements
    const returnPattern = /return\s+([^;]+);/g;
    while ((match = returnPattern.exec(code)) !== null) {
      flow.push(`→ ${match[1].trim()}`);
    }
    
    return flow.join(' → ') || 'Direct transformation';
  }

  /**
   * Generate a checklist based on the task and understanding
   */
  generateChecklist(understanding, taskMode) {
    const template = CONTEXT_TEMPLATES[taskMode];
    const baseChecklist = template ? template.checklist : [];
    
    const contextualChecklist = [];
    
    // Add error-specific checks
    if (understanding.errorType) {
      const errorPattern = ERROR_PATTERNS[understanding.errorType];
      if (errorPattern) {
        contextualChecklist.push(...errorPattern.causes.map(cause => `Check for ${cause}`));
      }
    }
    
    // Add concept-specific checks
    if (understanding.concepts.includes('authentication')) {
      contextualChecklist.push('Verify user is authenticated', 'Check token validity');
    }
    
    if (understanding.concepts.includes('database')) {
      contextualChecklist.push('Check database connection', 'Verify query syntax');
    }
    
    return [...new Set([...contextualChecklist, ...baseChecklist])].slice(0, 8);
  }

  /**
   * Suggest fixes based on the understanding
   */
  suggestFix(understanding) {
    if (understanding.errorType) {
      const pattern = ERROR_PATTERNS[understanding.errorType];
      return {
        pattern: pattern.pattern,
        possibleCauses: pattern.causes,
        fixes: pattern.fixes,
        example: pattern.example,
        confidence: 0.8
      };
    }
    
    // Generic suggestions based on concepts
    const suggestions = {
      pattern: 'General improvement',
      possibleCauses: ['Code could be optimized'],
      fixes: ['Review implementation', 'Add error handling', 'Improve performance'],
      example: '// Add specific implementation based on context',
      confidence: 0.5
    };
    
    return suggestions;
  }

  /**
   * Helper methods
   */
  
  detectTaskMode(query) {
    const lower = query.toLowerCase();
    if (lower.includes('bug') || lower.includes('error') || lower.includes('fix')) {
      return 'debugging';
    }
    if (lower.includes('add') || lower.includes('implement') || lower.includes('feature')) {
      return 'feature';
    }
    if (lower.includes('refactor') || lower.includes('improve') || lower.includes('optimize')) {
      return 'refactoring';
    }
    if (lower.includes('review') || lower.includes('check')) {
      return 'review';
    }
    return 'debugging'; // Default to debugging
  }

  extractProblemDescription(query) {
    // Simple extraction - can be enhanced
    return query.replace(/^(fix|debug|solve|help with)/i, '').trim();
  }

  generateRationale(analysis) {
    const concepts = analysis.concepts || [];
    const intent = analysis.intent || 'understand';
    return `Based on ${concepts.join(', ') || 'general'} concepts and ${intent} intent`;
  }

  calculateConfidence(analysis) {
    // Higher confidence with more specific concepts and entities
    const concepts = analysis.concepts || [];
    const entities = analysis.entities || [];
    const conceptScore = Math.min(concepts.length * 0.2, 0.6);
    const entityScore = Math.min(entities.length * 0.1, 0.3);
    return Math.min(0.5 + conceptScore + entityScore, 0.95);
  }

  explainRelevance(file, understanding) {
    const reasons = [];
    
    // Check for concept matches
    for (const concept of understanding.concepts) {
      if (file.file.toLowerCase().includes(concept)) {
        reasons.push(`Contains ${concept} logic`);
      }
    }
    
    // Check for matched concepts from semantic search
    if (file.matchedConcepts && file.matchedConcepts.length > 0) {
      reasons.push(`Matches: ${file.matchedConcepts.join(', ')}`);
    }
    
    return reasons.length > 0 ? reasons[0] : 'Semantically similar';
  }

  estimateTokens(pkg) {
    // Rough estimation: ~4 characters per token
    const json = JSON.stringify(pkg);
    return Math.ceil(json.length / 4);
  }
  
  trimToTokenLimit(text, tokenLimit) {
    // Roughly 4 characters per token
    const maxChars = tokenLimit * 4;
    if (!text || text.length <= maxChars) {
      return text;
    }
    return text.substring(0, maxChars) + '\n// ... truncated for token limit';
  }

  getFallbackPackage(query, error) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      summary: {
        query: query,
        taskMode: 'unknown',
        confidence: 0.1,
        error: error.message,
        fallback: true,
        timestamp: new Date().toISOString(),
        primaryFiles: []
      },
      understanding: {
        taskType: 'unknown',
        problemDescription: query,
        concepts: [],
        entities: [],
        errorType: null,
        hasError: false,
        rationale: 'Fallback mode due to error'
      },
      context: {
        coreImplementation: null,
        usage: null,
        dataFlow: null,
        dependencies: [],
        fallbackContext: {
          message: `Error: ${error.message}`,
          files: []
        }
      },
      relationships: {
        dependencies: [],
        provides: [],
        usedBy: [],
        commonlyChangedWith: []
      },
      checklist: [
        'Verify query is specific',
        'Check if files exist',
        'Ensure project is initialized'
      ],
      suggestedFix: {
        pattern: null,
        confidence: 0,
        suggestion: 'Try a more specific query or check file paths'
      },
      metadata: {
        tokenBudget: 6000,
        approxTokens: 100,
        sessionId: sessionId,
        relevantFiles: [],
        conversationId: null
      }
    };
  }

  // Implementation methods with actual file parsing
  async findTargetFunction(understanding, filePath) {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Look for function names from the query
      const functionPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
      const possibleFunctions = understanding.problemDescription.match(functionPattern) || [];
      
      for (const funcName of possibleFunctions) {
        // Look for function declaration patterns
        const patterns = [
          new RegExp(`function\\s+${funcName}\\s*\\(`, 'i'),
          new RegExp(`const\\s+${funcName}\\s*=.*=>`, 'i'),
          new RegExp(`${funcName}\\s*:\\s*function`, 'i'),
          new RegExp(`${funcName}\\s*\\(.*\\)\\s*{`, 'i'),
          new RegExp(`async\\s+${funcName}\\s*\\(`, 'i')
        ];
        
        for (let i = 0; i < lines.length; i++) {
          for (const pattern of patterns) {
            if (pattern.test(lines[i])) {
              // Found the function, find its end
              let endLine = i;
              let braceCount = 0;
              let started = false;
              
              for (let j = i; j < Math.min(i + 100, lines.length); j++) {
                if (lines[j].includes('{')) {
                  braceCount += (lines[j].match(/{/g) || []).length;
                  started = true;
                }
                if (lines[j].includes('}')) {
                  braceCount -= (lines[j].match(/}/g) || []).length;
                }
                if (started && braceCount === 0) {
                  endLine = j;
                  break;
                }
              }
              
              return {
                name: funcName,
                line: i + 1,
                startLine: i + 1,
                endLine: endLine + 1
              };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async extractFunctionCode(filePath, targetFunction) {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const startIdx = targetFunction.startLine - 1;
      const endIdx = targetFunction.endLine;
      
      return lines.slice(startIdx, endIdx).join('\n');
    } catch (error) {
      return '';
    }
  }

  async extractRelevantSection(filePath, understanding, tokenLimit) {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Find lines with relevant keywords
      const keywords = [...understanding.concepts, ...understanding.problemDescription.split(/\s+/)];
      const relevantLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        for (const keyword of keywords) {
          if (keyword.length > 2 && line.includes(keyword.toLowerCase())) {
            relevantLines.push(i);
            break;
          }
        }
      }
      
      if (relevantLines.length === 0) {
        // Return first 50 lines as fallback
        const code = lines.slice(0, 50).join('\n');
        return { lines: '1-50', code };
      }
      
      // Get context around the most relevant line
      const centerLine = relevantLines[Math.floor(relevantLines.length / 2)];
      const start = Math.max(0, centerLine - 20);
      const end = Math.min(lines.length, centerLine + 20);
      
      // Respect token limit (roughly 4 chars per token)
      let code = lines.slice(start, end).join('\n');
      const maxChars = tokenLimit * 4;
      if (code.length > maxChars) {
        code = code.substring(0, maxChars) + '\n// ... truncated for token limit';
      }
      
      return { 
        lines: `${start + 1}-${end}`,
        code 
      };
    } catch (error) {
      return { lines: '1-1', code: '// Error reading file' };
    }
  }

  async findFunctionUsage(filePath, functionName) {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Look for function calls
      const pattern = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
      
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          // Get context around the usage
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          const context = lines.slice(start, end).join('\n');
          
          return {
            line: i + 1,
            code: lines[i].trim(),
            context: context
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async extractImports(filePath) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure absolute path
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.projectRoot, filePath);
        
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      const imports = [];
      const importPattern = /import\s+(?:{([^}]+)}|([^;\s]+))\s+from\s+['"]([^'"]+)['"]/g;
      const requirePattern = /(?:const|let|var)\s+(?:{([^}]+)}|([^=\s]+))\s*=\s*require\s*\(['"]([^'"]+)['"]\)/g;
      
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        imports.push({
          type: 'import',
          items: match[1] || match[2],
          from: match[3]
        });
      }
      
      while ((match = requirePattern.exec(content)) !== null) {
        imports.push({
          type: 'require',
          items: match[1] || match[2],
          from: match[3]
        });
      }
      
      return imports;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Resolve import paths to actual project files
   */
  async resolveImportsToFiles(imports, sourceFile) {
    const path = await import('path');
    const fs = await import('fs/promises');
    const resolved = [];
    
    for (const imp of imports) {
      const fromPath = imp.from;
      
      // Skip node_modules and external packages
      if (!fromPath.startsWith('.') && !fromPath.startsWith('/')) {
        continue;
      }
      
      // Resolve relative imports
      const dir = path.dirname(sourceFile);
      let resolvedPath = path.resolve(dir, fromPath);
      
      // Try common extensions if no extension provided
      const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts'];
      for (const ext of extensions) {
        try {
          const testPath = resolvedPath + ext;
          await fs.access(testPath);
          
          // Make path relative to project root for consistency
          const relativePath = path.relative(this.projectRoot, testPath);
          resolved.push({
            file: relativePath,
            imports: imp.items?.split(',').map(i => i.trim()) || []
          });
          break;
        } catch (e) {
          // Try next extension
        }
      }
    }
    
    return resolved;
  }
  
  /**
   * Get co-change patterns from git history (via database)
   */
  async getCoChangePatterns(filePath) {
    try {
      const path = await import('path');
      const relativePath = path.relative(this.projectRoot, filePath);
      
      // Query database for co-change patterns
      const stmt = this.db.prepare(`
        SELECT DISTINCT related_file, co_change_count
        FROM file_relationships
        WHERE file_path = ? AND relationship_type = 'co_change'
        ORDER BY co_change_count DESC
        LIMIT 5
      `);
      
      const results = stmt.all(relativePath);
      
      if (results && results.length > 0) {
        return results.map(r => ({
          file: r.related_file,
          frequency: r.co_change_count
        }));
      }
      
      // If no DB data, try to get from git directly (fallback)
      return this.getCoChangeFromGit(filePath);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Get co-change patterns directly from git
   */
  async getCoChangeFromGit(filePath) {
    try {
      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit(this.projectRoot);
      const path = await import('path');
      
      const relativePath = path.relative(this.projectRoot, filePath);
      
      // Get commits that touched this file
      const log = await git.log(['--follow', '--', relativePath]);
      const commits = log.all.slice(0, 20); // Last 20 commits
      
      const coChangeMap = new Map();
      
      for (const commit of commits) {
        // Get files changed in this commit
        const diff = await git.diff(['--name-only', `${commit.hash}^`, commit.hash]);
        const files = diff.split('\n').filter(f => f && f !== relativePath);
        
        for (const file of files) {
          const count = coChangeMap.get(file) || 0;
          coChangeMap.set(file, count + 1);
        }
      }
      
      // Convert to array and sort by frequency
      return Array.from(coChangeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([file, count]) => ({
          file: file,
          frequency: count
        }));
    } catch (error) {
      // Git not available or file not in git
      return [];
    }
  }

  async extractExports(filePath) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure absolute path
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.projectRoot, filePath);
        
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      const exports = [];
      
      // ES6 exports
      const exportPattern = /export\s+(?:default\s+)?(?:(?:const|let|var|function|class)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/g;
      let match;
      while ((match = exportPattern.exec(content)) !== null) {
        if (match[1]) {
          exports.push(match[1]);
        }
      }
      
      // CommonJS exports
      const moduleExportPattern = /module\.exports\s*=\s*{([^}]+)}/;
      const moduleMatch = content.match(moduleExportPattern);
      if (moduleMatch) {
        const items = moduleMatch[1].split(',').map(item => item.trim().split(':')[0].trim());
        exports.push(...items);
      }
      
      // Individual module.exports
      const individualExportPattern = /exports\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
      while ((match = individualExportPattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
      
      return [...new Set(exports)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }

  async findConsumers(exports, filePath) {
    if (!exports || exports.length === 0) return [];
    
    try {
      // Get base filename without extension
      const path = await import('path');
      const fileName = path.basename(filePath).replace(/\.[^.]+$/, '');
      
      // This would ideally search all project files
      // For now, return common consumer patterns
      const consumers = [];
      
      if (fileName.toLowerCase().includes('context')) {
        consumers.push('Components using context');
      }
      if (fileName.toLowerCase().includes('service')) {
        consumers.push('API consumers');
      }
      if (exports.some(e => e.toLowerCase().includes('component'))) {
        consumers.push('Parent components');
      }
      
      return consumers;
    } catch (error) {
      return [];
    }
  }

  async findTestFiles(filePath) {
    try {
      const path = await import('path');
      const fs = await import('fs/promises');
      
      // Ensure absolute path
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.projectRoot, filePath);
      
      const dir = path.dirname(absolutePath);
      const baseName = path.basename(absolutePath).replace(/\.[^.]+$/, '');
      
      // Common test file patterns
      const testPatterns = [
        `${baseName}.test.js`,
        `${baseName}.spec.js`,
        `${baseName}.test.ts`,
        `${baseName}.spec.ts`,
        `test-${baseName}.js`,
        `${baseName}-test.js`
      ];
      
      const testFiles = [];
      
      // Check in same directory
      for (const pattern of testPatterns) {
        try {
          const testPath = path.join(dir, pattern);
          await fs.access(testPath);
          // Return relative path for consistency
          const relativePath = path.relative(this.projectRoot, testPath);
          testFiles.push(relativePath);
        } catch {
          // Test file doesn't exist, continue
        }
      }
      
      // Also check in __tests__ or test directories
      const testDirs = ['__tests__', 'test', 'tests'];
      for (const testDir of testDirs) {
        try {
          const testDirPath = path.join(dir, testDir);
          await fs.access(testDirPath);
          
          for (const pattern of testPatterns) {
            try {
              const testPath = path.join(testDirPath, pattern);
              await fs.access(testPath);
              const relativePath = path.relative(this.projectRoot, testPath);
              testFiles.push(relativePath);
            } catch {
              // Continue
            }
          }
        } catch {
          // Test directory doesn't exist
        }
      }
      
      return testFiles;
    } catch (error) {
      return [];
    }
  }

  async calculateImpact(filePath, exports) {
    const impact = {
      breaking: [],
      components: []
    };
    
    if (!exports || exports.length === 0) return impact;
    
    // Analyze export types for breaking changes
    for (const exp of exports) {
      if (exp.toLowerCase().includes('api') || exp.toLowerCase().includes('interface')) {
        impact.breaking.push(`Changes to ${exp} may break contracts`);
      }
      if (exp.toLowerCase().includes('context') || exp.toLowerCase().includes('provider')) {
        impact.components.push(`Components using ${exp}`);
      }
      if (exp.toLowerCase().includes('hook')) {
        impact.components.push(`Components using ${exp} hook`);
      }
    }
    
    return impact;
  }
}