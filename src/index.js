import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initDatabase, db } from './database-sqljs.js';
import { FileScanner } from './fileScanner.js';
import { ScopedFileScanner } from './fileScanner-scoped.js';
import { ContextAnalyzer } from './contextAnalyzer-pure.js';
import { ContextLearning } from './learning.js';
import { GitAnalyzer } from './gitAnalyzer.js';
import logger from './logger.js';
import config from './config.js';
import path from 'path';

// Get project root from environment or default
const projectRoot = process.env.PROJECT_ROOT || process.cwd();

// These will be initialized after database is ready
let analyzer;
let learning;
let gitAnalyzer;

// Create MCP server
const server = new Server(
  {
    name: 'smart-context-pruning',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define enhanced tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_optimal_context',
        description: 'Get optimal file context for a coding task (⚠️ Run setup_wizard first if you haven\'t configured your project!)',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Description of the coding task',
            },
            currentFile: {
              type: 'string',
              description: 'Path to the current file being edited (optional)',
            },
            projectRoot: {
              type: 'string',
              description: 'Root directory of the project',
              default: projectRoot,
            },
            targetTokens: {
              type: 'number',
              description: 'Target token budget (default: 6000)',
              default: 6000,
            },
            model: {
              type: 'string',
              description: 'LLM model being used',
              default: 'claude-3-opus',
            },
            conversationId: {
              type: 'string',
              description: 'Conversation ID for context tracking',
            },
            progressiveLevel: {
              type: 'number',
              description: 'Progressive loading level (1=immediate, 2=expanded, 3=comprehensive)',
              default: 1,
            },
            minRelevanceScore: {
              type: 'number',
              description: 'Minimum relevance score threshold (0-1)',
              default: 0.3,
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'expand_context',
        description: 'Expand context to include more files',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'number',
              description: 'Session ID from get_optimal_context',
            },
            additionalTokens: {
              type: 'number',
              description: 'Additional tokens to include',
              default: 2000,
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'record_session_outcome',
        description: 'Record whether a context selection was successful',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'number',
              description: 'Session ID from get_optimal_context',
            },
            wasSuccessful: {
              type: 'boolean',
              description: 'Whether the task was completed successfully',
            },
            filesActuallyUsed: {
              type: 'array',
              description: 'Which files were actually helpful',
              items: { type: 'string' },
            },
          },
          required: ['sessionId', 'wasSuccessful'],
        },
      },
      {
        name: 'get_file_relationships',
        description: 'Get files related to a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'File to find relationships for',
            },
            relationshipType: {
              type: 'string',
              description: 'Type of relationship (import, git-co-change, all)',
              default: 'all',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'search_codebase',
        description: 'Semantic search across the codebase',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query',
            },
            projectRoot: {
              type: 'string',
              description: 'Root directory of the project (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'analyze_git_patterns',
        description: 'Analyze git history for file relationships',
        inputSchema: {
          type: 'object',
          properties: {
            commitLimit: {
              type: 'number',
              description: 'Number of commits to analyze',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_learning_insights',
        description: 'Get insights about learned patterns',
        inputSchema: {
          type: 'object',
          properties: {
            taskMode: {
              type: 'string',
              description: 'Filter by task mode (debug, feature, refactor)',
            },
          },
        },
      },
      {
        name: 'apply_user_overrides',
        description: 'Apply user modifications to context selection for learning',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'number',
              description: 'Session ID from get_optimal_context',
            },
            added: {
              type: 'array',
              items: { type: 'string' },
              description: 'Files user manually added',
              default: [],
            },
            removed: {
              type: 'array',
              items: { type: 'string' },
              description: 'Files user manually removed',
              default: [],
            },
            kept: {
              type: 'array',
              items: { type: 'string' },
              description: 'Files user accepted as-is',
              default: [],
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'setup_wizard',
        description: 'FIRST TIME SETUP: Configure Smart Context for your project (START HERE!)',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['check', 'configure', 'list'],
              description: 'Action to perform: check current setup, configure new project, or list available projects',
              default: 'check'
            },
            projectPath: {
              type: 'string',
              description: 'Path to your project directory (for configure action)'
            },
            projectName: {
              type: 'string',
              description: 'Friendly name for your project (for configure action)'
            }
          }
        },
      },
      {
        name: 'set_project_scope',
        description: 'Configure project scope to limit file analysis for large codebases',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for this scope configuration',
              default: 'default',
            },
            includePaths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Glob patterns for paths to include (e.g., "src/**", "lib/**")',
            },
            excludePaths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Glob patterns for paths to exclude',
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum directory depth to scan',
              default: 10,
            },
            activate: {
              type: 'boolean',
              description: 'Whether to activate this scope immediately',
              default: true,
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_optimal_context': {
      // Determine the actual project root
      const actualProjectRoot = args.projectRoot || projectRoot;
      
      // Log where we're scanning for debugging
      logger.info(`Scanning project at: ${actualProjectRoot}`);
      
      // Use scoped scanner for large projects
      const scanner = new ScopedFileScanner(actualProjectRoot);
      const projectFiles = await scanner.scanCodebase();
      
      // Check if we found any files
      if (projectFiles.length === 0) {
        const isUsingDefault = !args.projectRoot && !process.env.PROJECT_ROOT;
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'No files found',
              message: isUsingDefault 
                ? '🔴 SETUP REQUIRED: Smart Context doesn\'t know where your project is!'
                : `No code files found in ${actualProjectRoot}.`,
              currentPath: actualProjectRoot,
              isDefaultPath: isUsingDefault,
              quickFix: isUsingDefault ? {
                step1: '🆕 Run setup_wizard first:',
                command: 'setup_wizard({"action": "check"})',
                step2: 'Then configure your project:',
                command2: 'setup_wizard({"action": "configure", "projectPath": "C:\\\\your\\\\actual\\\\project"})'
              } : {
                checklist: [
                  'Is this the correct project directory?',
                  'Does it contain code files (.js, .ts, .py, etc.)?',
                  'Check if .gitignore is excluding all files',
                  'Try specifying projectRoot in the request'
                ]
              },
              tip: isUsingDefault 
                ? '💡 Smart Context needs to scan your actual project files, not Claude\'s directory!'
                : 'Try running setup_wizard to check your configuration'
            }, null, 2)
          }]
        };
      }

      // Get optimal context
      const context = await analyzer.getOptimalContext({
        task: args.task,
        currentFile: args.currentFile || null,
        targetTokens: args.targetTokens || 6000,
        model: args.model || 'claude-3-opus',
        projectFiles,
        conversationId: args.conversationId,
        progressiveLevel: args.progressiveLevel || 1,
        minRelevanceScore: args.minRelevanceScore || config.get('context.minRelevanceScore', 0.3),
      });

      // Convert scores to tiers
      const getTier = (score) => {
        if (score >= 0.8) return 'essential';
        if (score >= 0.5) return 'recommended';
        return 'optional';
      };
      
      // Format response with tier system
      const response = {
        sessionId: context.sessionId || null,
        taskMode: context.taskMode || 'general',
        queryInterpretation: {
          intent: context.queryAnalysis?.intent || [],
          concepts: context.queryAnalysis?.concepts || [],
          entities: context.queryAnalysis?.entities || [],
        },
        included: (context.included || []).map(f => ({
          path: f.path,
          tier: getTier(f.score || 0),
          reasoning: f.reasons ? f.reasons : [],
          primaryReason: f.reasons ? f.reasons[0] : 'Related to task',
          tokens: f.tokens || 0,
          // Include raw scores only in debug info
          debug: {
            relevanceScore: f.score || 0,
            confidence: f.confidence || 0.5,
          }
        })),
        excluded: (context.excluded || []).slice(0, 5).map(f => ({
          path: f.path,
          tier: 'excluded',
          reasoning: f.reasons || ['Below relevance threshold'],
          debug: {
            score: f.score || 0,
          }
        })),
        totalTokens: context.totalTokens || 0,
        tokenBudget: context.tokenBudget || args.targetTokens || 6000,
        suggestions: context.suggestions || [],
        userControls: {
          minRelevanceScore: args.minRelevanceScore || 0.3,
          canAdjustThreshold: true,
          currentLevel: args.progressiveLevel || 1,
          availableLevels: [1, 2, 3],
        },
      };
      
      // Return in format expected by tests and MCP
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
        // Also include raw response for programmatic access
        ...response
      };
    }

    case 'expand_context': {
      // Implementation for progressive context expansion
      return {
        content: [
          {
            type: 'text',
            text: 'Context expansion not yet implemented in this MVP',
          },
        ],
      };
    }

    case 'record_session_outcome': {
      try {
        // Validate sessionId exists
        if (!args.sessionId) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Missing sessionId',
                message: 'sessionId is required to record outcome'
              }, null, 2)
            }]
          };
        }

        // Check if session exists
        const session = db.prepare('SELECT * FROM context_sessions WHERE id = ?').get(args.sessionId);
        if (!session) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Session not found',
                sessionId: args.sessionId,
                message: 'The specified session does not exist'
              }, null, 2)
            }]
          };
        }

        // Update learning model
        learning.updateRelevanceScores(
          args.sessionId,
          args.wasSuccessful,
          args.filesActuallyUsed || []
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Session outcome recorded. Learning model updated.',
              sessionId: args.sessionId
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error recording session outcome:', error);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to record outcome',
              message: error.message
            }, null, 2)
          }]
        };
      }
    }

    case 'search_codebase': {
      const actualProjectRoot = args.projectRoot || projectRoot;
      const scanner = new FileScanner(actualProjectRoot);
      const projectFiles = scanner.scanCodebase();
      
      if (projectFiles.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'No files found',
              message: `No code files found in ${actualProjectRoot}. Please set PROJECT_ROOT correctly.`,
              currentPath: actualProjectRoot
            }, null, 2)
          }]
        };
      }
      
      const queryAnalysis = analyzer.semanticSearch.analyzeQuery(args.query);
      const results = await analyzer.semanticSearch.findSimilarFiles(
        queryAnalysis,
        projectFiles,
        args.limit || 10
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              interpretation: queryAnalysis,
              results: results.map(r => ({
                file: r.file,
                similarity: (r.similarity * 100).toFixed(0) + '%',
                matchedConcepts: r.matchedConcepts,
              })),
            }, null, 2),
          },
        ],
      };
    }

    case 'analyze_git_patterns': {
      const coChanges = await gitAnalyzer.analyzeCoChanges(args.commitLimit || 100);
      const recentFiles = await gitAnalyzer.getRecentlyModifiedFiles(48);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              analyzedCommits: args.commitLimit || 100,
              coChangePatterns: Array.from(coChanges.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([files, count]) => ({
                  files: files.split('|'),
                  coChangeCount: count,
                })),
              recentlyModified: recentFiles.slice(0, 10),
            }, null, 2),
          },
        ],
      };
    }

    case 'get_file_relationships': {
      const relationships = learning.getFileRelationships(
        args.filePath,
        args.relationshipType || 'all'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(relationships, null, 2),
          },
        ],
      };
    }

    case 'get_learning_insights': {
      const insights = learning.getEnhancedInsights(args.taskMode);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(insights, null, 2),
          },
        ],
      };
    }

    case 'apply_user_overrides': {
      // Record user overrides for learning (Phase 1: just track them)
      const { sessionId, added = [], removed = [], kept = [] } = args;
      
      // Get session info
      const session = db.prepare('SELECT * FROM context_sessions WHERE id = ?').get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Record each override
      const stmt = db.prepare(`
        INSERT INTO user_overrides 
        (session_id, file_path, override_type, task_type, task_mode)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      added.forEach(file => {
        stmt.run(sessionId, file, 'added', session.task_type, session.task_mode);
      });
      
      removed.forEach(file => {
        stmt.run(sessionId, file, 'removed', session.task_type, session.task_mode);
      });
      
      kept.forEach(file => {
        stmt.run(sessionId, file, 'kept', session.task_type, session.task_mode);
      });
      
      // Save database
      const dbData = db.export();
      const { writeFileSync } = await import('fs');
      writeFileSync('./data/smart-context.db', Buffer.from(dbData));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'User overrides recorded',
              sessionId,
              overrides: {
                added: added.length,
                removed: removed.length,
                kept: kept.length
              }
            }, null, 2),
          },
        ],
      };
    }

    case 'setup_wizard': {
      const { action = 'check', projectPath, projectName } = args;
      
      switch (action) {
        case 'check': {
          const currentRoot = process.env.PROJECT_ROOT || process.cwd();
          const isDefault = !process.env.PROJECT_ROOT;
          
          // Try to scan current directory
          const scanner = new ScopedFileScanner(currentRoot);
          let fileCount = 0;
          let sampleFiles = [];
          
          try {
            const files = await scanner.scanCodebase();
            fileCount = files.length;
            sampleFiles = files.slice(0, 5).map(f => f.path);
          } catch (error) {
            logger.error('Scan error:', error);
          }
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: isDefault ? 'not_configured' : 'configured',
                message: isDefault 
                  ? '⚠️ PROJECT_ROOT not configured! Smart Context doesn\'t know where your project is.'
                  : '✅ PROJECT_ROOT is configured',
                currentPath: currentRoot,
                isDefault,
                filesFound: fileCount,
                sampleFiles,
                nextSteps: isDefault ? [
                  '1. Use setup_wizard with action="configure" to set up your project',
                  '2. Or manually set PROJECT_ROOT in Claude Desktop config',
                  '3. See the setup guide at QUICK_START.md'
                ] : [
                  `Currently analyzing: ${currentRoot}`,
                  `Found ${fileCount} code files`,
                  'Use action="list" to see all configured projects'
                ],
                setupCommand: isDefault ? 
                  'Use: setup_wizard({"action": "configure", "projectPath": "C:\\\\path\\\\to\\\\your\\\\project"})' : null
              }, null, 2)
            }]
          };
        }
        
        case 'configure': {
          if (!projectPath) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Project path required',
                  message: 'Please provide the path to your project directory',
                  example: 'setup_wizard({"action": "configure", "projectPath": "C:\\\\Users\\\\you\\\\my-project", "projectName": "My Project"})'
                }, null, 2)
              }]
            };
          }
          
          // Generate configuration
          const isWindows = process.platform === 'win32';
          const configPath = isWindows 
            ? '%APPDATA%\\Claude\\claude_desktop_config.json'
            : '~/Library/Application Support/Claude/claude_desktop_config.json';
          
          const name = projectName || path.basename(projectPath);
          const serverName = `smart-context-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          
          const configSnippet = {
            [serverName]: {
              command: 'node',
              args: [process.argv[1]], // Current script path
              env: {
                PROJECT_ROOT: projectPath
              }
            }
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: '🎉 Configuration generated! Follow these steps:',
                steps: [
                  `1. Open your Claude Desktop config at: ${configPath}`,
                  '2. Add this to the "mcpServers" section:',
                  JSON.stringify(configSnippet, null, 2),
                  '3. Save the file',
                  '4. Completely restart Claude Desktop',
                  '5. Test with: "Find any JavaScript files in my project"'
                ],
                projectDetails: {
                  name: name,
                  path: projectPath,
                  serverName: serverName
                },
                troubleshooting: [
                  'Make sure to use double backslashes in Windows paths',
                  'The config file might not exist yet - create it if needed',
                  'You must fully restart Claude Desktop, not just reload'
                ]
              }, null, 2)
            }]
          };
        }
        
        case 'list': {
          // This would ideally read from a config file
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: 'To see all projects, check your Claude Desktop config',
                currentProject: process.env.PROJECT_ROOT || 'Not configured',
                hint: 'Each "smart-context-*" entry in mcpServers is a different project'
              }, null, 2)
            }]
          };
        }
      }
    }
    
    case 'set_project_scope': {
      const { name = 'default', includePaths = [], excludePaths = [], maxDepth = 10, activate = true } = args;
      
      // Deactivate other scopes if activating this one
      if (activate) {
        db.prepare('UPDATE project_scopes SET is_active = 0').run();
      }
      
      // Insert or update scope
      db.prepare(`
        INSERT OR REPLACE INTO project_scopes 
        (name, include_paths, exclude_paths, max_depth, is_active)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        name,
        JSON.stringify(includePaths),
        JSON.stringify(excludePaths),
        maxDepth,
        activate ? 1 : 0
      );
      
      // Apply scope to file scanner
      if (activate && fileScanner) {
        fileScanner.setScope({
          includePaths,
          excludePaths,
          maxDepth
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: activate ? 'Project scope set and activated' : 'Project scope saved',
              scope: {
                name,
                includePaths,
                excludePaths,
                maxDepth,
                active: activate
              }
            }, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  // Initialize database first
  await initDatabase();
  
  // Now initialize components
  analyzer = new ContextAnalyzer(projectRoot);
  learning = new ContextLearning();
  gitAnalyzer = new GitAnalyzer(projectRoot);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Smart Context Pruning MCP server v2.0 running on stdio');
  
  // Run initial git analysis in background
  setTimeout(() => {
    gitAnalyzer.analyzeCoChanges(100).catch(err => logger.error('Git analysis error:', err));
  }, 1000);
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});