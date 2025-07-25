import React from 'react';

function TaskItem({ task, onToggle, onDelete }) {
  // FEATURE REQUEST: Add priority levels (high, medium, low)
  // FEATURE REQUEST: Add due dates
  
  return (
    <div className={`task-item ${task.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <span className="task-text">{task.text}</span>
      {/* TODO: Add priority badge here */}
      <button 
        className="delete-btn"
        onClick={() => onDelete(task.id)}
      >
        Delete
      </button>
    </div>
  );
}

export default TaskItem;