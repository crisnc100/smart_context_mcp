// Task API service
// BUG: Tasks don't persist after page refresh

const STORAGE_KEY = 'taskmanager_tasks';

export const getTasks = async () => {
  // Simulating API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // BUG: Should be reading from localStorage
  // const stored = localStorage.getItem(STORAGE_KEY);
  // return stored ? JSON.parse(stored) : [];
  
  return []; // Always returns empty array
};

export const saveTask = async (task) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // TODO: Implement localStorage persistence
  // const tasks = await getTasks();
  // tasks.push(task);
  // localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  
  return task;
};

export const deleteTask = async (taskId) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // TODO: Implement deletion
  return true;
};

export const updateTask = async (taskId, updates) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // TODO: Implement task updates
  return { id: taskId, ...updates };
};