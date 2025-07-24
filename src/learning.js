import { db } from './database-sqljs.js';

export class ContextLearning {
  updateRelevanceScores(sessionId, wasSuccessful, filesActuallyUsed = []) {
    const session = db.prepare(
      'SELECT * FROM context_sessions WHERE id = ?'
    ).get(sessionId);

    if (!session) return;

    const includedFiles = JSON.parse(session.included_files);
    const taskType = session.task_type;
    const taskMode = session.task_mode;

    // Update session outcome
    db.prepare(`
      UPDATE context_sessions 
      SET outcome_success = ?, 
          files_actually_used = ?
      WHERE id = ?
    `).run(
      wasSuccessful ? 1 : 0, 
      JSON.stringify(filesActuallyUsed),
      sessionId
    );

    // Update file relevance with different weights
    for (const filePath of includedFiles) {
      const wasActuallyUsed = filesActuallyUsed.includes(filePath);
      const scoreAdjustment = this.calculateScoreAdjustment(
        wasSuccessful,
        wasActuallyUsed
      );
      
      this.updateFileRelevance(filePath, taskType, taskMode, scoreAdjustment);
    }

    // Update file relationships based on actual usage
    if (wasSuccessful && filesActuallyUsed.length > 1) {
      this.updateFileRelationships(filesActuallyUsed, true, 'actually-used-together');
    }
  }

  calculateScoreAdjustment(wasSuccessful, wasActuallyUsed) {
    if (wasSuccessful && wasActuallyUsed) return 0.15;  // Strong positive
    if (wasSuccessful && !wasActuallyUsed) return -0.05; // Slight negative
    if (!wasSuccessful && wasActuallyUsed) return 0.05;  // Slight positive
    return -0.1; // Not successful and not used
  }

  updateFileRelevance(filePath, taskType, taskMode, scoreAdjustment) {
    const existing = db.prepare(`
      SELECT * FROM file_relevance 
      WHERE file_path = ? AND task_type = ? AND task_mode = ?
    `).get(filePath, taskType, taskMode);

    if (existing) {
      const alpha = 0.1; // Learning rate
      const newScore = existing.relevance_score + alpha * scoreAdjustment;
      const newConfidence = Math.min(existing.confidence + 0.05, 1.0);
      
      db.prepare(`
        UPDATE file_relevance 
        SET relevance_score = ?,
            confidence = ?,
            success_count = success_count + ?,
            total_count = total_count + 1,
            last_updated = CURRENT_TIMESTAMP
        WHERE file_path = ? AND task_type = ? AND task_mode = ?
      `).run(
        Math.max(0, Math.min(1, newScore)),
        newConfidence,
        scoreAdjustment > 0 ? 1 : 0,
        filePath,
        taskType,
        taskMode
      );
    } else {
      db.prepare(`
        INSERT INTO file_relevance 
        (file_path, task_type, task_mode, relevance_score, confidence, success_count, total_count)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(
        filePath,
        taskType,
        taskMode,
        0.5 + scoreAdjustment,
        0.5,
        scoreAdjustment > 0 ? 1 : 0
      );
    }
  }

  updateFileRelationships(files, wasSuccessful, relationshipType = 'co-selected') {
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const fileA = files[i];
        const fileB = files[j];
        
        const existing = db.prepare(`
          SELECT * FROM file_relationships 
          WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
        `).get(fileA, fileB, fileB, fileA);

        const strengthAdjustment = wasSuccessful ? 0.1 : -0.05;

        if (existing) {
          db.prepare(`
            UPDATE file_relationships 
            SET co_occurrence_count = co_occurrence_count + 1,
                strength = ?,
                relationship_type = ?
            WHERE (file_a = ? AND file_b = ?) OR (file_a = ? AND file_b = ?)
          `).run(
            Math.max(0, Math.min(1, existing.strength + strengthAdjustment)),
            relationshipType,
            fileA, fileB, fileB, fileA
          );
        } else {
          db.prepare(`
            INSERT INTO file_relationships 
            (file_a, file_b, co_occurrence_count, relationship_type, strength)
            VALUES (?, ?, 1, ?, ?)
          `).run(fileA, fileB, relationshipType, 0.5 + strengthAdjustment);
        }
      }
    }
  }

  getFileRelationships(filePath, relationshipType = 'all') {
    let query = `
      SELECT * FROM file_relationships 
      WHERE (file_a = ? OR file_b = ?)
    `;
    
    if (relationshipType !== 'all') {
      query += ` AND relationship_type = ?`;
    }
    
    query += ` ORDER BY strength DESC LIMIT 20`;

    const stmt = db.prepare(query);
    const results = relationshipType === 'all' ? 
      stmt.all(filePath, filePath) : 
      stmt.all(filePath, filePath, relationshipType);

    return results.map(r => ({
      relatedFile: r.file_a === filePath ? r.file_b : r.file_a,
      type: r.relationship_type,
      strength: (r.strength * 100).toFixed(0) + '%',
      coOccurrences: r.co_occurrence_count,
      gitCoChanges: r.git_co_change_count || 0,
    }));
  }

  getEnhancedInsights(taskMode = null) {
    // Task mode specific stats
    let taskQuery = `
      SELECT 
        task_type,
        task_mode,
        COUNT(*) as session_count,
        SUM(outcome_success) as success_count,
        AVG(total_tokens) as avg_tokens,
        COUNT(DISTINCT conversation_id) as unique_conversations
      FROM context_sessions
    `;
    
    if (taskMode) {
      taskQuery += ` WHERE task_mode = ?`;
    }
    
    taskQuery += ` GROUP BY task_type, task_mode`;
    
    const taskStats = taskMode ? 
      db.prepare(taskQuery).all(taskMode) : 
      db.prepare(taskQuery).all();

    // Top performing files by mode
    const topFilesQuery = `
      SELECT 
        file_path,
        task_mode,
        relevance_score,
        confidence,
        success_count,
        total_count,
        ROUND(CAST(success_count AS REAL) / total_count * 100, 1) as success_rate
      FROM file_relevance
      WHERE relevance_score > 0.7
      ${taskMode ? 'AND task_mode = ?' : ''}
      ORDER BY relevance_score DESC, confidence DESC
      LIMIT 20
    `;

    const topFiles = taskMode ?
      db.prepare(topFilesQuery).all(taskMode) :
      db.prepare(topFilesQuery).all();

    // Most successful file combinations
    const successfulCombos = db.prepare(`
      SELECT 
        included_files,
        task_mode,
        COUNT(*) as usage_count,
        SUM(outcome_success) as success_count
      FROM context_sessions
      WHERE outcome_success = 1
      ${taskMode ? 'AND task_mode = ?' : ''}
      GROUP BY included_files, task_mode
      HAVING usage_count > 2
      ORDER BY success_count DESC
      LIMIT 10
    `).all(taskMode || undefined);

    // Learning progress over time
    const learningProgress = db.prepare(`
      SELECT 
        DATE(timestamp) as date,
        AVG(CASE WHEN outcome_success THEN 1.0 ELSE 0.0 END) as success_rate,
        COUNT(*) as sessions
      FROM context_sessions
      WHERE timestamp > datetime('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();

    return {
      taskModeStats: taskStats.map(t => ({
        ...t,
        successRate: ((t.success_count / t.session_count) * 100).toFixed(1) + '%',
      })),
      topPerformingFiles: topFiles,
      successfulCombinations: successfulCombos.map(c => ({
        files: JSON.parse(c.included_files),
        mode: c.task_mode,
        usageCount: c.usage_count,
        successCount: c.success_count,
        successRate: ((c.success_count / c.usage_count) * 100).toFixed(1) + '%',
      })),
      learningProgress,
      summary: {
        totalSessions: taskStats.reduce((sum, t) => sum + t.session_count, 0),
        overallSuccessRate: (
          (taskStats.reduce((sum, t) => sum + t.success_count, 0) /
           taskStats.reduce((sum, t) => sum + t.session_count, 0)) * 100
        ).toFixed(1) + '%',
        mostSuccessfulMode: taskStats.sort((a, b) => 
          (b.success_count / b.session_count) - (a.success_count / a.session_count)
        )[0]?.task_mode || 'none',
      },
    };
  }
}