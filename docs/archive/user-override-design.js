// User Override Learning Design

// 1. Database Schema Addition
const userOverridesTable = `
CREATE TABLE IF NOT EXISTS user_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  override_type TEXT NOT NULL, -- 'added', 'removed', 'kept'
  task_type TEXT NOT NULL,
  task_mode TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES context_sessions(id)
);

CREATE TABLE IF NOT EXISTS override_patterns (
  file_path TEXT NOT NULL,
  task_pattern TEXT NOT NULL, -- Similar task descriptions
  override_count INTEGER DEFAULT 1,
  last_override_type TEXT,
  cumulative_adjustment REAL DEFAULT 0.0,
  confidence REAL DEFAULT 0.5,
  PRIMARY KEY (file_path, task_pattern)
);
`;

// 2. MCP Tool Implementation
export const applyUserOverrides = {
  name: 'apply_user_overrides',
  description: 'Apply user modifications to context selection and learn from them',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'number',
        description: 'Session ID from get_optimal_context'
      },
      added: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files user manually added'
      },
      removed: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files user manually removed'
      },
      kept: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files user accepted as-is'
      }
    },
    required: ['sessionId']
  }
};

// 3. Learning Logic
class OverrideLearning {
  applyOverrides(sessionId, added = [], removed = [], kept = []) {
    const session = this.getSession(sessionId);
    
    // Record all overrides
    added.forEach(file => {
      this.recordOverride(sessionId, file, 'added', session);
    });
    
    removed.forEach(file => {
      this.recordOverride(sessionId, file, 'removed', session);
    });
    
    kept.forEach(file => {
      this.recordOverride(sessionId, file, 'kept', session);
    });
    
    // Apply learning after checking patterns
    this.applyPatternLearning(session);
  }
  
  recordOverride(sessionId, filePath, type, session) {
    // Insert into user_overrides
    db.prepare(`
      INSERT INTO user_overrides 
      (session_id, file_path, override_type, task_type, task_mode)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, filePath, type, session.task_type, session.task_mode);
    
    // Update pattern tracking
    const pattern = this.extractTaskPattern(session.task_description);
    const existing = db.prepare(`
      SELECT * FROM override_patterns 
      WHERE file_path = ? AND task_pattern = ?
    `).get(filePath, pattern);
    
    if (existing) {
      // Update existing pattern
      const newCount = existing.override_count + 1;
      let adjustment = existing.cumulative_adjustment;
      
      // Apply learning based on consistency
      if (newCount >= 3 && existing.last_override_type === type) {
        if (type === 'added') {
          adjustment += 0.3; // Strong positive signal
        } else if (type === 'removed') {
          adjustment -= 0.05; // Weak negative signal
        }
      }
      
      db.prepare(`
        UPDATE override_patterns 
        SET override_count = ?, 
            last_override_type = ?,
            cumulative_adjustment = ?,
            confidence = ?
        WHERE file_path = ? AND task_pattern = ?
      `).run(
        newCount, 
        type, 
        Math.max(-0.5, Math.min(1.0, adjustment)), // Clamp between -0.5 and 1.0
        Math.min(1.0, existing.confidence + 0.1),
        filePath, 
        pattern
      );
    } else {
      // Create new pattern
      db.prepare(`
        INSERT INTO override_patterns 
        (file_path, task_pattern, override_count, last_override_type, cumulative_adjustment)
        VALUES (?, ?, 1, ?, ?)
      `).run(
        filePath, 
        pattern, 
        type,
        type === 'added' ? 0.1 : (type === 'removed' ? -0.02 : 0)
      );
    }
  }
  
  // Apply learned adjustments to relevance scores
  getOverrideAdjustment(filePath, taskDescription) {
    const pattern = this.extractTaskPattern(taskDescription);
    const override = db.prepare(`
      SELECT cumulative_adjustment, confidence 
      FROM override_patterns 
      WHERE file_path = ? AND task_pattern = ?
    `).get(filePath, pattern);
    
    if (override && override.confidence > 0.5) {
      return override.cumulative_adjustment;
    }
    return 0;
  }
  
  extractTaskPattern(description) {
    // Simple pattern extraction - could be enhanced with NLP
    const keywords = description.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'with', 'from'].includes(word))
      .sort()
      .slice(0, 5)
      .join('-');
    return keywords;
  }
}

// 4. Integration with Context Selection
class EnhancedContextAnalyzer {
  async getOptimalContext(params) {
    // ... existing logic ...
    
    // Apply user override adjustments
    files.forEach(file => {
      const overrideAdjustment = this.overrideLearning.getOverrideAdjustment(
        file.path, 
        params.task
      );
      
      if (overrideAdjustment !== 0) {
        file.score += overrideAdjustment;
        file.reasons.push(`User preference: ${overrideAdjustment > 0 ? 'often added' : 'often removed'}`);
        file.confidence = Math.max(file.confidence, 0.8);
      }
    });
    
    // ... rest of logic ...
  }
}