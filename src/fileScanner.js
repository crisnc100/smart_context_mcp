import { glob } from 'glob';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import ignore from 'ignore';

export class FileScanner {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.ignoreRules = this.loadIgnoreRules();
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
      '**/*.map'
    ]);

    // Load .gitignore if exists
    try {
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch (error) {
      // No .gitignore file
    }

    return ig;
  }

  scanCodebase() {
    const patterns = [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs',
      '**/*.cpp',
      '**/*.c',
      '**/*.h',
      '**/*.cs',
      '**/*.rb',
      '**/*.php',
      '**/*.swift',
      '**/*.kt',
      '**/*.scala',
      '**/*.r',
      '**/*.m',
      '**/*.mm',
      '**/*.vue',
      '**/*.svelte'
    ];

    const files = [];
    
    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        cwd: this.projectRoot,
        ignore: ['node_modules/**', '.git/**'],
        nodir: true
      });

      for (const match of matches) {
        if (!this.ignoreRules.ignores(match)) {
          files.push(this.analyzeFile(match));
        }
      }
    }

    return files;
  }

  analyzeFile(relativePath) {
    const fullPath = path.join(this.projectRoot, relativePath);
    const content = readFileSync(fullPath, 'utf-8');
    const stats = statSync(fullPath);
    
    return {
      path: relativePath,
      fullPath,
      size: stats.size,
      lastModified: stats.mtime,
      extension: path.extname(relativePath),
      imports: this.extractImports(content, relativePath),
      exports: this.extractExports(content, relativePath),
      functions: this.extractFunctions(content, relativePath),
      classes: this.extractClasses(content, relativePath),
      hasTests: this.detectTests(content, relativePath),
      complexity: this.estimateComplexity(content)
    };
  }

  extractImports(content, filePath) {
    const imports = [];
    const ext = path.extname(filePath);
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      // ES6 imports
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      // CommonJS requires
      const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
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
      // ES6 exports
      const exportRegex = /export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+(\w+)/g;
      let match;
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }
      
      // Named exports
      const namedExportRegex = /export\s*\{([^}]+)\}/g;
      while ((match = namedExportRegex.exec(content)) !== null) {
        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
        exports.push(...names);
      }
    }
    
    return [...new Set(exports)];
  }

  extractFunctions(content, filePath) {
    const functions = [];
    const ext = path.extname(filePath);
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      // Multiple patterns to catch different function styles
      const patterns = [
        // function declarations: function myFunc() {}
        /function\s+(\w+)\s*\(/g,
        // const/let/var arrow functions: const myFunc = () => {}
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>/g,
        // const/let/var regular functions: const myFunc = function() {}
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/g,
        // export function: export function myFunc() {}
        /export\s+(?:async\s+)?function\s+(\w+)/g,
        // export const arrow: export const myFunc = () => {}
        /export\s+(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>/g,
        // method shorthand in objects: myFunc() {}
        /^\s*(\w+)\s*\([^)]*\)\s*\{/gm,
        // TypeScript method signatures: myFunc(param: type): returnType
        /^\s*(?:public|private|protected)?\s*(?:static)?\s*(\w+)\s*\([^)]*\)\s*:/gm
      ];
      
      patterns.forEach(regex => {
        let match;
        while ((match = regex.exec(content)) !== null) {
          if (match[1] && !['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
            functions.push(match[1]);
          }
        }
      });
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
      const classRegex = /class\s+(\w+)/g;
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        classes.push(match[1]);
      }
    } else if (['.py'].includes(ext)) {
      const pyClassRegex = /class\s+(\w+)/g;
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
      /def\s+test_/
    ];
    
    return testPatterns.some(pattern => pattern.test(content)) ||
           filePath.includes('test') ||
           filePath.includes('spec');
  }

  estimateComplexity(content) {
    // Simple complexity estimation based on various factors
    const lines = content.split('\n').length;
    const conditions = (content.match(/if\s*\(|while\s*\(|for\s*\(|switch\s*\(/g) || []).length;
    const functions = (content.match(/function\s+\w+|=>\s*\{|def\s+\w+/g) || []).length;
    
    const complexity = Math.min(
      1.0,
      (lines / 500) * 0.3 +
      (conditions / 50) * 0.4 +
      (functions / 20) * 0.3
    );
    
    return complexity;
  }
}