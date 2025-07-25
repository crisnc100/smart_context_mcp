import React, { useState, useEffect } from 'react';
import TaskList from './components/TaskList';
import AddTask from './components/AddTask';
import { getTasks, saveTask } from './services/api';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (taskText) => {
    const newTask = {
      id: Date.now(),
      text: taskText,
      completed: false,
      createdAt: new Date().toISOString()
    };

    // BUG: Not persisting to localStorage
    setTasks([...tasks, newTask]);
    
    // TODO: Add error handling
    await saveTask(newTask);
  };

  const handleToggleTask = (taskId) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="app">
      <h1>Task Manager</h1>
      <AddTask onAdd={handleAddTask} />
      <TaskList 
        tasks={tasks} 
        onToggle={handleToggleTask}
      />
    </div>
  );
}

export default App;