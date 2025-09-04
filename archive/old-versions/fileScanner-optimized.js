import { glob } from 'glob';
import { readFile, stat } from 'fs/promises';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import ignore from 'ignore';
import { createHash } from 'crypto';

export class OptimizedFileScanner {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      maxFileSize: options.maxFileSize || 1024 * 1024, // 1MB default
      enableCache: options.enableCache !== false,
      cacheExpiry: options.cacheExpiry || 5 * 60 * 1000, // 5 minutes
      parallel: options.parallel !== false,
      batchSize: options.batchSize || 10,
      ...options
    };
    
    this.ignoreRules = this.loadIgnoreRules();
    this.cache = new Map();
    this.errors = [];
  }

  loadIgnoreRules() {
    const ig = ignore();
    
    // Default ignores
    ig.add([
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.log',
      '.env*',
      '**/*.min.js',
      '**/*.map',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.ico',
      '**/*.svg',
      '**/*.woff',
      '**/*.woff2',
      '**/*.ttf',
      '**/*.eot',
      '**/*.pdf',
      '**/*.zip',
      '**/*.tar',
      '**/*.gz'
    ]);

    // Load .gitignore if exists
    try {
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch (error) {
      // No .gitignore file, not an error
    }

    return ig;
  }

  async scanCodebase() {
    const patterns = [
      '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx',
      '**/*.py', '**/*.java', '**/*.go', '**/*.rs',
      '**/*.cpp', '**/*.c', '**/*.h', '**/*.cs',
      '**/*.rb', '**/*.php', '**/*.swift', '**/*.kt',
      '**/*.scala', '**/*.r', '**/*.m', '**/*.mm',
      '**/*.vue', '**/*.svelte'
    ];

    const allFiles = [];
    this.errors = []; // Reset errors
    
    // Collect all file paths first
    const filePaths = [];
    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, {
          cwd: this.projectRoot,
          ignore: ['node_modules/**', '.git/**'],
          nodir: true
        });

        for (const match of matches) {
          if (!this.ignoreRules.ignores(match)) {
            filePaths.push(match);
          }
        }
      } catch (error) {
        this.errors.push({ pattern, error: error.message });
      }
    }

    // Process files in parallel batches
    if (this.options.parallel) {
      const batches = [];
      for (let i = 0; i < filePaths.length; i += this.options.batchSize) {
        batches.push(filePaths.slice(i, i + this.options.batchSize));
      }

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(filePath => this.analyzeFileAsync(filePath))
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            allFiles.push(result.value);
          } else if (result.status === 'rejected') {
            this.errors.push({ file: 'unknown', error: result.reason });
          }
        }
      }
    } else {
      // Fallback to synchronous processing
      for (const filePath of filePaths) {
        const fileData = this.analyzeFileSync(filePath);
        if (fileData) {
          allFiles.push(fileData);
        }
      }
    }

    // Clean expired cache entries
    this.cleanCache();

    return allFiles;
  }

  async analyzeFileAsync(relativePath) {
    const fullPath = path.join(this.projectRoot, relativePath);
    
    try {
      // Check cache first
      const cached = this.getCached(fullPath);
      if (cached) return cached;

      // Get file stats
      const stats = await stat(fullPath);
      
      // Skip files that are too large
      if (stats.size > this.options.maxFileSize) {
        this.errors.push({
          file: relativePath,
          error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB`
        });
        return {
          path: relativePath,
          fullPath,
          size: stats.size,
          lastModified: stats.mtime,
          extension: path.extname(relativePath),
          skipped: true,
          skipReason: 'File too large',
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          hasTests: false,
          complexity: 0
        };
      }

      // Read file content
      const content = await readFile(fullPath, 'utf-8');
      
      const analysis = this.analyzeContent(content, relativePath, stats);
      
      // Cache the result
      this.setCache(fullPath, analysis);
      
      return analysis;
    } catch (error) {
      this.errors.push({
        file: relativePath,
        error: error.message
      });
      return null;
    }
  }

  analyzeFileSync(relativePath) {
    const fullPath = path.join(this.projectRoot, relativePath);
    
    try {
      // Check cache first
      const cached = this.getCached(fullPath);
      if (cached) return cached;

      // Get file stats
      const stats = statSync(fullPath);
      
      // Skip files that are too large
      if (stats.size > this.options.maxFileSize) {
        this.errors.push({
          file: relativePath,
          error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB`
        });
        return {
          path: relativePath,
          fullPath,
          size: stats.size,
          lastModified: stats.mtime,
          extension: path.extname(relativePath),
          skipped: true,
          skipReason: 'File too large',
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          hasTests: false,
          complexity: 0
        };
      }

      // Read file content
      const content = readFileSync(fullPath, 'utf-8');
      
      const analysis = this.analyzeContent(content, relativePath, stats);
      
      // Cache the result
      this.setCache(fullPath, analysis);
      
      return analysis;
    } catch (error) {
      this.errors.push({
        file: relativePath,
        error: error.message
      });
      return null;
    }
  }

  analyzeContent(content, relativePath, stats) {
    return {
      path: relativePath,
      fullPath: path.join(this.projectRoot, relativePath),
      size: stats.size,
      lastModified: stats.mtime,
      extension: path.extname(relativePath),
      imports: this.safeExtract(() => this.extractImports(content, relativePath), []),
      exports: this.safeExtract(() => this.extractExports(content, relativePath), []),
      functions: this.safeExtract(() => this.extractFunctions(content, relativePath), []),
      classes: this.safeExtract(() => this.extractClasses(content, relativePath), []),
      hasTests: this.detectTests(content, relativePath),
      complexity: this.estimateComplexity(content),
      hash: this.hashContent(content)
    };
  }

  safeExtract(extractFn, defaultValue) {
    try {
      return extractFn();
    } catch (error) {
      // Silently handle parsing errors
      return defaultValue;
    }
  }

  getCached(fullPath) {
    if (!this.options.enableCache) return null;
    
    const cached = this.cache.get(fullPath);
    if (cached && Date.now() - cached.timestamp < this.options.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCache(fullPath, data) {
    if (!this.options.enableCache) return;
    
    this.cache.set(fullPath, {
      data,
      timestamp: Date.now()
    });
  }

  cleanCache() {
    if (!this.options.enableCache) return;
    
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.options.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }

  hashContent(content) {
    return createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  extractImports(content, filePath) {
    const imports = [];
    const ext = path.extname(filePath);
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      // ES6 imports - improved regex to handle multiline
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/gm;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      // CommonJS requires
      const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      // Dynamic imports
      const dynamicImportRegex = /import\s*\(['"]([^'"]+)['"]\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (['.py'].includes(ext)) {
      // Python imports
      const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g;
      let match;
      while ((match = pythonImportRegex.exec(content)) !== null) {
        if (match[1]) {
          imports.push(match[1]);
        }
      }
    }
    
    return [...new Set(imports)];
  }

  extractExports(content, filePath) {
    const exports = [];
    const ext = path.extname(filePath);
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      // ES6 exports - handle all cases
      const patterns = [
        /export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+(\w+)/g,
        /export\s*\{([^}]+)\}/g,
        /export\s+default\s+(\w+)/g,
        /module\.exports\s*=\s*\{([^}]+)\}/g,
        /exports\.(\w+)\s*=/g
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[1].includes(',')) {
            // Handle multiple exports
            const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
            exports.push(...names);
          } else {
            exports.push(match[1]);
          }
        }
      }
    }
    
    return [...new Set(exports.filter(e => e && e.trim()))];
  }

  extractFunctions(content, filePath) {
    const functions = [];
    const ext = path.extname(filePath);
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      // Function declarations and arrow functions
      const patterns = [
        /(?:async\s+)?function\s+(\w+)\s*\(/g,
        /const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>/g,
        /(\w+)\s*:\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>/g  // Object methods
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          functions.push(match[1]);
        }
      }
    } else if (['.py'].includes(ext)) {
      // Python functions
      const pyFuncRegex = /def\s+(\w+)\s*\(/g;
      let match;
      while ((match = pyFuncRegex.exec(content)) !== null) {
        functions.push(match[1]);
      }
    }
    
    return [...new Set(functions)];
  }

  extractClasses(content, filePath) {
    const classes = [];
    const ext = path.extname(filePath);
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?/g;
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        classes.push(match[1]);
      }
    } else if (['.py'].includes(ext)) {
      const pyClassRegex = /class\s+(\w+)(?:\s*\([^)]*\))?:/g;
      let match;
      while ((match = pyClassRegex.exec(content)) !== null) {
        classes.push(match[1]);
      }
    }
    
    return [...new Set(classes)];
  }

  detectTests(content, filePath) {
    const testPatterns = [
      /test|spec/i,
      /describe\s*\(/,
      /it\s*\(/,
      /expect\s*\(/,
      /@Test/,
      /def\s+test_/,
      /class\s+Test/
    ];
    
    return testPatterns.some(pattern => pattern.test(content)) ||
           filePath.includes('test') ||
           filePath.includes('spec') ||
           filePath.includes('__tests__');
  }

  estimateComplexity(content) {
    // Enhanced complexity estimation
    const lines = content.split('\n').length;
    const conditions = (content.match(/if\s*\(|while\s*\(|for\s*\(|switch\s*\(|\?[^:]+:/g) || []).length;
    const functions = (content.match(/function\s+\w+|=>\s*\{|def\s+\w+/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const callbacks = (content.match(/\.\w+\([^)]*\([^)]*\)/g) || []).length; // Nested callbacks
    
    const complexity = Math.min(
      1.0,
      (lines / 500) * 0.2 +
      (conditions / 50) * 0.3 +
      (functions / 20) * 0.2 +
      (classes / 10) * 0.2 +
      (callbacks / 10) * 0.1
    );
    
    return Math.round(complexity * 100) / 100;
  }

  getErrors() {
    return this.errors;
  }
}