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
        description: 'Get optimal file context for a coding task with semantic understanding',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Description of the coding task',
            },
            currentFile: {
              type: 'string',
              description: 'Path to the current file being edited',
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
          required: ['task', 'currentFile'],
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
      // Use scoped scanner for large projects
      const scanner = new ScopedFileScanner(args.projectRoot || projectRoot);
      const projectFiles = await scanner.scanCodebase();

      // Get optimal context
      const context = await analyzer.getOptimalContext({
        task: args.task,
        currentFile: args.currentFile,
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
      learning.updateRelevanceScores(
        args.sessionId,
        args.wasSuccessful,
        args.filesActuallyUsed
      );

      return {
        content: [
          {
            type: 'text',
            text: 'Session outcome recorded. Learning model updated.',
          },
        ],
      };
    }

    case 'search_codebase': {
      const scanner = new FileScanner(projectRoot);
      const projectFiles = scanner.scanCodebase();
      
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
  console.error('Smart Context Pruning MCP server v2.0 running on stdio');
  
  // Run initial git analysis in background
  setTimeout(() => {
    gitAnalyzer.analyzeCoChanges(100).catch(console.error);
  }, 1000);
}

main().catch(console.error);