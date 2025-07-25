import React from 'react';
import TaskItem from './TaskItem';

// Last modified: 2 hours ago (for demo purposes)
function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>No tasks yet. Add one above!</p>
      </div>
    );
  }

  // TODO: Add filtering by priority
  // TODO: Add sorting options
  
  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default TaskList;