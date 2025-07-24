import { OptimizedFileScanner } from './fileScanner-optimized.js';
import path from 'path';

export class ScopedFileScanner extends OptimizedFileScanner {
  constructor(projectRoot, options = {}) {
    super(projectRoot, options);
    this.scope = null;
    // Load scope asynchronously after construction
    this.loadActiveScope().catch(err => console.debug('Scope loading:', err));
  }

  async loadActiveScope() {
    try {
      const { db } = await import('./database-sqljs.js');
      const activeScope = db.prepare(
        'SELECT * FROM project_scopes WHERE is_active = 1'
      ).get();
      
      if (activeScope) {
        this.scope = {
          name: activeScope.name,
          includePaths: JSON.parse(activeScope.include_paths || '[]'),
          excludePaths: JSON.parse(activeScope.exclude_paths || '[]'),
          maxDepth: activeScope.max_depth || 10
        };
        console.log(`Loaded active scope: ${this.scope.name}`);
      }
    } catch (error) {
      console.debug('No active scope found');
    }
  }

  setScope(scope) {
    this.scope = scope;
    // Clear cache when scope changes
    this.cache.clear();
  }

  shouldScanFile(relativePath) {
    // If no scope is set, use parent's rules
    if (!this.scope) {
      return true;
    }

    // Check depth limit
    const depth = relativePath.split(path.sep).length - 1;
    if (depth > this.scope.maxDepth) {
      return false;
    }

    // Simple pattern matching without minimatch
    const matchesPattern = (filePath, pattern) => {
      // Convert glob pattern to regex
      const regex = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
        .replace(/\//g, '\\/');
      return new RegExp('^' + regex + '$').test(filePath);
    };

    // Check exclude patterns first (higher priority)
    if (this.scope.excludePaths.length > 0) {
      for (const pattern of this.scope.excludePaths) {
        if (matchesPattern(relativePath, pattern)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (this.scope.includePaths.length > 0) {
      for (const pattern of this.scope.includePaths) {
        if (matchesPattern(relativePath, pattern)) {
          return true;
        }
      }
      // If include patterns are specified but none match, exclude
      return false;
    }

    // If no include patterns specified, include by default
    return true;
  }

  async scanCodebase() {
    console.log('🔍 Scanning with scope:', this.scope ? this.scope.name : 'none');
    
    if (this.scope) {
      console.log(`  Include: ${this.scope.includePaths.join(', ') || 'all'}`);
      console.log(`  Exclude: ${this.scope.excludePaths.join(', ') || 'none'}`);
      console.log(`  Max depth: ${this.scope.maxDepth}`);
    }

    // Get all files from parent scanner
    const allFiles = await super.scanCodebase();
    
    // If no scope, return all files
    if (!this.scope) {
      console.log(`✅ Scanned ${allFiles.length} files (no scope)`);
      return allFiles;
    }
    
    // Filter files based on scope
    const scopedFiles = allFiles.filter(file => this.shouldScanFile(file.path));
    
    console.log(`✅ Scanned ${scopedFiles.length} files within scope (filtered from ${allFiles.length})`);
    
    return scopedFiles;
  }

  getScopeStats() {
    if (!this.scope) {
      return {
        active: false,
        message: 'No scope configured - scanning entire project'
      };
    }

    return {
      active: true,
      name: this.scope.name,
      includePaths: this.scope.includePaths,
      excludePaths: this.scope.excludePaths,
      maxDepth: this.scope.maxDepth,
      filesInScope: this.cache.size,
      message: `Using scope '${this.scope.name}'`
    };
  }
}

// Example usage for very large projects:
// const scanner = new ScopedFileScanner('/path/to/huge/project');
// scanner.setScope({
//   name: 'auth-module',
//   includePaths: ['src/auth/**', 'src/middleware/auth*', 'tests/auth/**'],
//   excludePaths: ['**/*.test.js'],
//   maxDepth: 5
// });