import { db } from './database-sqljs.js';
import { v4 as uuidv4 } from 'uuid';

export class ConversationTracker {
  constructor() {
    this.activeConversations = new Map();
  }

  // Start or get conversation
  getOrCreateConversation(conversationId) {
    if (!conversationId) {
      conversationId = uuidv4();
    }

    if (!this.activeConversations.has(conversationId)) {
      // Load from DB or create new
      const existing = db.prepare(
        'SELECT * FROM conversation_context WHERE conversation_id = ?'
      ).get(conversationId);

      if (existing) {
        this.activeConversations.set(conversationId, {
          id: conversationId,
          filesViewed: JSON.parse(existing.files_viewed || '[]'),
          currentTask: existing.current_task,
          taskProgress: JSON.parse(existing.task_progress || '{}'),
          createdAt: existing.created_at
        });
      } else {
        const newConversation = {
          id: conversationId,
          filesViewed: [],
          currentTask: null,
          taskProgress: {},
          createdAt: new Date().toISOString()
        };
        
        this.activeConversations.set(conversationId, newConversation);
        this.saveConversation(newConversation);
      }
    }

    return this.activeConversations.get(conversationId);
  }

  // Track file as viewed
  markFileViewed(conversationId, filePath) {
    const conversation = this.getOrCreateConversation(conversationId);
    
    if (!conversation.filesViewed.includes(filePath)) {
      conversation.filesViewed.push(filePath);
      this.saveConversation(conversation);
    }
  }

  // Get files already viewed in conversation
  getViewedFiles(conversationId) {
    const conversation = this.getOrCreateConversation(conversationId);
    return conversation.filesViewed;
  }

  // Update task progress
  updateTaskProgress(conversationId, progress) {
    const conversation = this.getOrCreateConversation(conversationId);
    conversation.taskProgress = { ...conversation.taskProgress, ...progress };
    this.saveConversation(conversation);
  }

  // Check if file was already suggested
  wasFileSuggested(conversationId, filePath) {
    const conversation = this.getOrCreateConversation(conversationId);
    return conversation.filesViewed.includes(filePath);
  }

  // Get conversation context for relevance scoring
  getConversationContext(conversationId) {
    const conversation = this.getOrCreateConversation(conversationId);
    
    return {
      filesViewed: conversation.filesViewed,
      currentTask: conversation.currentTask,
      taskProgress: conversation.taskProgress,
      duration: Date.now() - new Date(conversation.createdAt).getTime()
    };
  }

  // Save conversation to database
  saveConversation(conversation) {
    db.prepare(`
      INSERT OR REPLACE INTO conversation_context 
      (conversation_id, files_viewed, current_task, task_progress, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      conversation.id,
      JSON.stringify(conversation.filesViewed),
      conversation.currentTask,
      JSON.stringify(conversation.taskProgress)
    );
  }

  // Clean up old conversations (run periodically)
  cleanupOldConversations() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    db.prepare(
      'DELETE FROM conversation_context WHERE updated_at < ?'
    ).run(oneDayAgo);

    // Remove from memory
    for (const [id, conversation] of this.activeConversations) {
      if (new Date(conversation.createdAt) < new Date(oneDayAgo)) {
        this.activeConversations.delete(id);
      }
    }
  }
}