import simpleGit from 'simple-git';
import { db } from './database-sqljs.js';

export class GitAnalyzer {
  constructor(repoPath) {
    this.git = simpleGit(repoPath);
    this.repoPath = repoPath;
    this.isGitRepo = null;
  }

  async checkGitRepo() {
    if (this.isGitRepo !== null) return this.isGitRepo;
    
    try {
      await this.git.status();
      this.isGitRepo = true;
    } catch (error) {
      this.isGitRepo = false;
    }
    return this.isGitRepo;
  }

  // Get files that frequently change together
  async analyzeCoChanges(limit = 100) {
    // Check if this is a git repo first
    if (!(await this.checkGitRepo())) {
      console.debug('Not a git repository, skipping co-change analysis');
      return new Map();
    }

    try {
      // Get recent commits
      const log = await this.git.log(['--oneline', '-n', limit.toString()]);
      const coChanges = new Map();

      // Analyze each commit
      for (const commit of log.all) {
        try {
          // For the first commit, compare against empty tree
          let diff;
          if (commit.hash === log.all[log.all.length - 1].hash) {
            // This might be the first commit
            try {
              diff = await this.git.diff(['--name-only', `${commit.hash}^`, commit.hash]);
            } catch (e) {
              // If parent doesn't exist, get all files in the commit
              diff = await this.git.raw(['show', '--pretty=', '--name-only', commit.hash]);
            }
          } else {
            diff = await this.git.diff(['--name-only', `${commit.hash}^`, commit.hash]);
          }
          
          const files = diff.split('\n').filter(f => f.trim());

          // Track co-changes
          for (let i = 0; i < files.length; i++) {
            for (let j = i + 1; j < files.length; j++) {
              const key = [files[i], files[j]].sort().join('|');
              coChanges.set(key, (coChanges.get(key) || 0) + 1);
            }
          }
        } catch (commitError) {
          // Skip this commit if there's an error
          console.debug(`Skipping commit ${commit.hash}: ${commitError.message}`);
        }
      }

      // Update database
      for (const [key, count] of coChanges) {
        const [fileA, fileB] = key.split('|');
        this.updateCoChangeCount(fileA, fileB, count);
      }

      return coChanges;
    } catch (error) {
      console.error('Git analysis error:', error);
      return new Map();
    }
  }

  // Get recently modified files (useful for debugging)
  async getRecentlyModifiedFiles(hours = 24) {
    if (!(await this.checkGitRepo())) {
      return [];
    }

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const logResult = await this.git.log(['--since', since, '--name-only', '--pretty=format:']);
      
      // Handle both string and object responses from git log
      let logText = '';
      if (typeof logResult === 'string') {
        logText = logResult;
      } else if (logResult && logResult.latest) {
        // simple-git returns an object with 'latest' property
        logText = logResult.all.map(commit => {
          // Get files from each commit
          return commit.diff ? commit.diff.files.map(f => f.file).join('\n') : '';
        }).filter(Boolean).join('\n');
      } else if (logResult && logResult.all) {
        // Alternative format from simple-git
        logText = logResult.all.map(c => c.hash).join('\n');
      }
      
      // If we still don't have text, try raw command
      if (!logText) {
        logText = await this.git.raw(['log', '--since', since, '--name-only', '--pretty=format:']);
      }
      
      const files = logText.split('\n')
        .filter(f => f.trim() && !f.includes('commit'))
        .reduce((acc, file) => {
          acc[file] = (acc[file] || 0) + 1;
          return acc;
        }, {});

      return Object.entries(files)
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, modificationCount: count }));
    } catch (error) {
      console.error('Git recent files error:', error);
      return [];
    }
  }

  // Get file authors (useful for finding domain experts)
  async getFileAuthors(filePath) {
    if (!(await this.checkGitRepo())) {
      return [];
    }

    try {
      const blame = await this.git.raw(['blame', '--line-porcelain', filePath]);
      const authors = new Map();

      const lines = blame.split('\n');
      for (const line of lines) {
        if (line.startsWith('author ')) {
          const author = line.replace('author ', '').trim();
          authors.set(author, (authors.get(author) || 0) + 1);
        }
      }

      return Array.from(authors.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([author, lines]) => ({ author, lines }));
    } catch (error) {
      return [];
    }
  }

  // Update co-change count in database
  updateCoChangeCount(fileA, fileB, count) {
    const existing = db.prepare(`
      SELECT * FROM file_relationships 
      WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
    `).get(fileA, fileB, fileB, fileA);

    if (existing) {
      db.prepare(`
        UPDATE file_relationships 
        SET git_co_change_count = ?,
            strength = strength + ?
        WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
      `).run(count, count * 0.01, fileA, fileB, fileB, fileA);
    } else {
      db.prepare(`
        INSERT INTO file_relationships 
        (file_a, file_b, git_co_change_count, relationship_type, strength)
        VALUES (?, ?, ?, 'git-co-change', ?)
      `).run(fileA, fileB, count, count * 0.1);
    }
  }

  // Check if file has recent changes (for debugging tasks)
  async hasRecentChanges(filePath, hours = 48) {
    const recentFiles = await this.getRecentlyModifiedFiles(hours);
    return recentFiles.some(f => f.file === filePath);
  }
}