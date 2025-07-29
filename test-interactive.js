#!/usr/bin/env node

// Interactive test runner for Smart Context MCP
// Tests various difficult cases to objectively measure improvements

import { FileScanner } from './src/fileScanner.js';
import { ContextAnalyzer } from './src/contextAnalyzer-pure.js';
import { SemanticSearch } from './src/semanticSearch.js';
import { QueryEnhancer } from './src/queryEnhancer.js';
import { initDatabase } from './src/database-sqljs.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test cases with expected results
const TEST_CASES = [
  {
    id: 'exercise-formatter',
    query: 'exercise naming formatting variation names',
    expectedFiles: ['exerciseFormatters.ts', 'exerciseService.ts'],
    description: 'Original user case - finding exercise formatting functions'
  },
  {
    id: 'auth-middleware',
    query: 'user authentication token validation',
    expectedFiles: ['authMiddleware.js', 'tokenValidator.js', 'userService.js'],
    description: 'Finding authentication and validation logic'
  },
  {
    id: 'db-connection',
    query: 'database connection pool error handling',
    expectedFiles: ['dbConnection.js', 'connectionPool.js', 'dbErrors.js'],
    description: 'Database connection and error handling'
  },
  {
    id: 'api-routes',
    query: 'REST API endpoint user profile update',
    expectedFiles: ['userRoutes.js', 'profileController.js', 'userModel.js'],
    description: 'API routes and controllers'
  },
  {
    id: 'react-hooks',
    query: 'custom hook fetch data loading state',
    expectedFiles: ['useDataFetch.js', 'useFetch.js', 'LoadingComponent.jsx'],
    description: 'React hooks and state management'
  },
  {
    id: 'error-boundary',
    query: 'error boundary component crash handling',
    expectedFiles: ['ErrorBoundary.jsx', 'errorHandler.js', 'crashReporter.js'],
    description: 'Error handling components'
  },
  {
    id: 'config-parser',
    query: 'configuration file parsing environment variables',
    expectedFiles: ['configParser.js', 'envLoader.js', 'settings.js'],
    description: 'Configuration and environment handling'
  },
  {
    id: 'test-mocks',
    query: 'mock service unit test helpers',
    expectedFiles: ['mockService.js', 'testHelpers.js', 'serviceMocks.js'],
    description: 'Testing utilities and mocks'
  },
  {
    id: 'data-transform',
    query: 'transform normalize data pipeline processing',
    expectedFiles: ['dataTransformer.js', 'normalizer.js', 'pipeline.js'],
    description: 'Data transformation pipeline'
  },
  {
    id: 'websocket-handler',
    query: 'websocket connection message handler real-time',
    expectedFiles: ['websocketHandler.js', 'messageProcessor.js', 'realtimeService.js'],
    description: 'WebSocket and real-time messaging'
  }
];

// Create test project structure
function createTestProject() {
  const testDir = path.join(__dirname, 'test-project');
  
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  
  mkdirSync(testDir, { recursive: true });
  
  // Create directory structure
  const dirs = [
    'src/utils',
    'src/services',
    'src/middleware',
    'src/controllers',
    'src/models',
    'src/components',
    'src/hooks',
    'src/config',
    'src/api',
    'test/mocks'
  ];
  
  dirs.forEach(dir => mkdirSync(path.join(testDir, dir), { recursive: true }));
  
  // Create test files
  const files = {
    // Exercise formatter case
    'src/utils/exerciseFormatters.ts': `
export function constructExerciseName(exercise: Exercise): string {
  const { name, variation, equipment } = exercise;
  return \`\${name}\${variation ? ' - ' + formatVariation(variation) : ''}\`;
}

export function formatOptionName(option: ExerciseOption): string {
  return option.name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

export function formatVariation(variation: string): string {
  return variation.replace(/_/g, ' ').toLowerCase();
}
`,
    'src/services/exerciseService.ts': `
import { constructExerciseName } from '../utils/exerciseFormatters';

export class ExerciseService {
  getFormattedExercises() {
    return this.exercises.map(ex => ({
      ...ex,
      displayName: constructExerciseName(ex)
    }));
  }
}
`,
    
    // Auth middleware case
    'src/middleware/authMiddleware.js': `
const { validateToken } = require('../utils/tokenValidator');

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const user = await validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authenticate };
`,
    'src/utils/tokenValidator.js': `
const jwt = require('jsonwebtoken');

async function validateToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function generateToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
}

module.exports = { validateToken, generateToken };
`,
    'src/services/userService.js': `
const { generateToken } = require('../utils/tokenValidator');

class UserService {
  async authenticateUser(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !await this.verifyPassword(password, user.password)) {
      throw new Error('Invalid credentials');
    }
    return { user, token: generateToken(user) };
  }
}
`,
    
    // Database connection case
    'src/config/dbConnection.js': `
const { Pool } = require('pg');
const { handleConnectionError } = require('./dbErrors');

let pool;

function createConnectionPool(config) {
  pool = new Pool({
    ...config,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  pool.on('error', (err, client) => {
    handleConnectionError(err);
  });
  
  return pool;
}

module.exports = { createConnectionPool, getPool: () => pool };
`,
    'src/config/connectionPool.js': `
class ConnectionPool {
  constructor(options) {
    this.options = options;
    this.connections = [];
    this.waiting = [];
  }
  
  async acquire() {
    if (this.connections.length > 0) {
      return this.connections.pop();
    }
    
    if (this.connections.length < this.options.max) {
      return this.createConnection();
    }
    
    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }
}
`,
    'src/config/dbErrors.js': `
function handleConnectionError(error) {
  console.error('Database connection error:', error);
  
  if (error.code === 'ECONNREFUSED') {
    throw new Error('Database server is not running');
  }
  
  if (error.code === 'ETIMEDOUT') {
    throw new Error('Database connection timeout');
  }
  
  throw error;
}

class DatabaseError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
`,
    
    // API routes case
    'src/api/userRoutes.js': `
const express = require('express');
const { updateProfile } = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/users/:id/profile', authenticate, updateProfile);
router.get('/users/:id', authenticate, getUser);

module.exports = router;
`,
    'src/controllers/profileController.js': `
const { UserModel } = require('../models/userModel');

async function updateProfile(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updated = await user.updateProfile(updates);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
`,
    'src/models/userModel.js': `
class UserModel {
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
  
  async updateProfile(updates) {
    const allowed = ['name', 'email', 'bio', 'avatar'];
    const filtered = Object.keys(updates)
      .filter(key => allowed.includes(key))
      .reduce((obj, key) => ({ ...obj, [key]: updates[key] }), {});
    
    return this.update(filtered);
  }
}
`,
    
    // React hooks case
    'src/hooks/useDataFetch.js': `
import { useState, useEffect } from 'react';

export function useDataFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const result = await response.json();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => { cancelled = true; };
  }, [url]);
  
  return { data, loading, error };
}
`,
    'src/hooks/useFetch.js': `
import { useReducer, useEffect } from 'react';

const fetchReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_INIT':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    default:
      throw new Error();
  }
};

export const useFetch = (url) => {
  const [state, dispatch] = useReducer(fetchReducer, {
    loading: true,
    error: null,
    data: null,
  });
  
  useEffect(() => {
    let didCancel = false;
    
    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT' });
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!didCancel) {
          dispatch({ type: 'FETCH_SUCCESS', payload: data });
        }
      } catch (error) {
        if (!didCancel) {
          dispatch({ type: 'FETCH_FAILURE', payload: error });
        }
      }
    };
    
    fetchData();
    
    return () => {
      didCancel = true;
    };
  }, [url]);
  
  return state;
};
`,
    'src/components/LoadingComponent.jsx': `
import React from 'react';

export const LoadingComponent = ({ loading, error, children }) => {
  if (loading) {
    return (
      <div className="loading-spinner">
        <span>Loading...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-message">
        <span>Error: {error.message}</span>
      </div>
    );
  }
  
  return children;
};
`,
    
    // Error boundary case
    'src/components/ErrorBoundary.jsx': `
import React from 'react';
import { logError } from '../utils/errorHandler';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo);
    this.reportCrash(error, errorInfo);
  }
  
  reportCrash(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
`,
    'src/utils/errorHandler.js': `
export function logError(error, context) {
  console.error('Application error:', error);
  
  if (context) {
    console.error('Error context:', context);
  }
  
  // Send to error tracking service
  if (window.errorTracker) {
    window.errorTracker.captureException(error, { context });
  }
}

export function handleAsyncError(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error);
      throw error;
    }
  };
}
`,
    'src/utils/crashReporter.js': `
class CrashReporter {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.queue = [];
    
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
  }
  
  handleError(event) {
    this.report({
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
  
  handleRejection(event) {
    this.report({
      type: 'unhandledRejection',
      reason: event.reason,
      promise: event.promise
    });
  }
  
  report(crash) {
    this.queue.push(crash);
    this.flush();
  }
}
`,
    
    // Config parser case
    'src/config/configParser.js': `
const fs = require('fs');
const path = require('path');
const { loadEnvFile } = require('./envLoader');

class ConfigParser {
  constructor() {
    this.config = {};
    this.envVars = loadEnvFile();
  }
  
  parseFile(filePath) {
    const ext = path.extname(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.yaml':
      case '.yml':
        return this.parseYaml(content);
      case '.env':
        return this.parseEnv(content);
      default:
        throw new Error(\`Unsupported config format: \${ext}\`);
    }
  }
  
  interpolateEnvVars(value) {
    if (typeof value !== 'string') return value;
    
    return value.replace(/\\\${([^}]+)}/g, (match, key) => {
      return process.env[key] || this.envVars[key] || match;
    });
  }
}
`,
    'src/config/envLoader.js': `
const fs = require('fs');
const path = require('path');

function loadEnvFile(envPath = '.env') {
  const fullPath = path.resolve(process.cwd(), envPath);
  
  if (!fs.existsSync(fullPath)) {
    return {};
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const vars = {};
  
  content.split('\\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    
    vars[key.trim()] = value.replace(/^["']|["']$/g, '');
  });
  
  return vars;
}

function loadEnvironmentVariables() {
  const env = loadEnvFile();
  Object.entries(env).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}
`,
    'src/config/settings.js': `
const { ConfigParser } = require('./configParser');

class Settings {
  constructor() {
    this.parser = new ConfigParser();
    this.config = {};
    this.loadDefaults();
  }
  
  loadDefaults() {
    this.config = {
      app: {
        name: process.env.APP_NAME || 'MyApp',
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'myapp'
      }
    };
  }
  
  load(configPath) {
    const fileConfig = this.parser.parseFile(configPath);
    this.merge(fileConfig);
  }
}
`,
    
    // Test mocks case
    'test/mocks/mockService.js': `
export class MockService {
  constructor(returnValue = null) {
    this.returnValue = returnValue;
    this.calls = [];
  }
  
  mockImplementation(fn) {
    this.implementation = fn;
    return this;
  }
  
  mockReturnValue(value) {
    this.returnValue = value;
    return this;
  }
  
  mockReturnValueOnce(value) {
    this.returnValues = this.returnValues || [];
    this.returnValues.push(value);
    return this;
  }
  
  execute(...args) {
    this.calls.push(args);
    
    if (this.implementation) {
      return this.implementation(...args);
    }
    
    if (this.returnValues && this.returnValues.length > 0) {
      return this.returnValues.shift();
    }
    
    return this.returnValue;
  }
}
`,
    'test/mocks/testHelpers.js': `
export function createMockFunction(name, returnValue) {
  const mock = jest.fn();
  mock.mockName(name);
  
  if (returnValue !== undefined) {
    mock.mockReturnValue(returnValue);
  }
  
  return mock;
}

export function createSpyOn(object, method) {
  const original = object[method];
  const spy = jest.fn(original);
  object[method] = spy;
  
  spy.restore = () => {
    object[method] = original;
  };
  
  return spy;
}

export function waitFor(fn, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        const result = fn();
        if (result) {
          resolve(result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 50);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    check();
  });
}
`,
    'test/mocks/serviceMocks.js': `
import { MockService } from './mockService';

export const mockUserService = new MockService({
  id: '123',
  name: 'Test User',
  email: 'test@example.com'
});

export const mockAuthService = new MockService({
  token: 'mock-jwt-token',
  expiresIn: 3600
});

export const mockDatabaseService = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  transaction: jest.fn(async (callback) => {
    const client = { query: jest.fn(), release: jest.fn() };
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  })
};

export function resetAllMocks() {
  mockUserService.calls = [];
  mockAuthService.calls = [];
  Object.values(mockDatabaseService).forEach(mock => {
    if (mock.mockClear) mock.mockClear();
  });
}
`,
    
    // Data transform case
    'src/utils/dataTransformer.js': `
export class DataTransformer {
  constructor(transformations = []) {
    this.transformations = transformations;
  }
  
  addTransformation(name, fn) {
    this.transformations.push({ name, fn });
    return this;
  }
  
  transform(data) {
    return this.transformations.reduce((acc, { name, fn }) => {
      try {
        return fn(acc);
      } catch (error) {
        console.error(\`Transformation \${name} failed:\`, error);
        throw new TransformError(\`Failed at \${name}\`, error);
      }
    }, data);
  }
  
  async transformAsync(data) {
    let result = data;
    
    for (const { name, fn } of this.transformations) {
      try {
        result = await fn(result);
      } catch (error) {
        console.error(\`Async transformation \${name} failed:\`, error);
        throw new TransformError(\`Failed at \${name}\`, error);
      }
    }
    
    return result;
  }
}

class TransformError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}
`,
    'src/utils/normalizer.js': `
export function normalizeData(data, schema) {
  const normalized = {};
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];
    
    if (rules.required && value === undefined) {
      throw new Error(\`Missing required field: \${key}\`);
    }
    
    if (value !== undefined) {
      normalized[key] = applyRules(value, rules);
    } else if (rules.default !== undefined) {
      normalized[key] = rules.default;
    }
  }
  
  return normalized;
}

function applyRules(value, rules) {
  let result = value;
  
  if (rules.type === 'string') {
    result = String(result);
    if (rules.trim) result = result.trim();
    if (rules.lowercase) result = result.toLowerCase();
    if (rules.uppercase) result = result.toUpperCase();
  }
  
  if (rules.type === 'number') {
    result = Number(result);
    if (rules.min !== undefined) result = Math.max(result, rules.min);
    if (rules.max !== undefined) result = Math.min(result, rules.max);
  }
  
  if (rules.transform) {
    result = rules.transform(result);
  }
  
  return result;
}
`,
    'src/utils/pipeline.js': `
export class Pipeline {
  constructor(name) {
    this.name = name;
    this.stages = [];
    this.errorHandlers = [];
  }
  
  addStage(name, processor, options = {}) {
    this.stages.push({
      name,
      processor,
      skipOnError: options.skipOnError || false,
      parallel: options.parallel || false
    });
    return this;
  }
  
  onError(handler) {
    this.errorHandlers.push(handler);
    return this;
  }
  
  async process(input) {
    let result = input;
    const context = { input, stages: [] };
    
    for (const stage of this.stages) {
      try {
        const startTime = Date.now();
        
        if (stage.parallel && Array.isArray(result)) {
          result = await Promise.all(
            result.map(item => stage.processor(item, context))
          );
        } else {
          result = await stage.processor(result, context);
        }
        
        context.stages.push({
          name: stage.name,
          duration: Date.now() - startTime,
          success: true
        });
      } catch (error) {
        context.stages.push({
          name: stage.name,
          error: error.message,
          success: false
        });
        
        if (!stage.skipOnError) {
          await this.handleError(error, context);
          throw error;
        }
      }
    }
    
    return result;
  }
}
`,
    
    // WebSocket handler case
    'src/services/websocketHandler.js': `
const WebSocket = require('ws');
const { processMessage } = require('./messageProcessor');

class WebSocketHandler {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map();
    this.setupHandlers();
  }
  
  setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, { ws, metadata: {} });
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          const response = await this.handleMessage(clientId, message);
          
          if (response) {
            ws.send(JSON.stringify(response));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
      });
      
      ws.send(JSON.stringify({
        type: 'connected',
        clientId
      }));
    });
  }
  
  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    
    switch (message.type) {
      case 'subscribe':
        client.metadata.subscriptions = message.channels;
        break;
      
      case 'broadcast':
        await this.broadcast(message.channel, message.data, clientId);
        break;
      
      default:
        return processMessage(message);
    }
  }
}
`,
    'src/services/messageProcessor.js': `
const { EventEmitter } = require('events');

class MessageProcessor extends EventEmitter {
  constructor() {
    super();
    this.handlers = new Map();
    this.middleware = [];
  }
  
  registerHandler(type, handler) {
    this.handlers.set(type, handler);
  }
  
  use(middleware) {
    this.middleware.push(middleware);
  }
  
  async processMessage(message) {
    // Run middleware
    for (const mw of this.middleware) {
      const result = await mw(message);
      if (result === false) {
        return null;
      }
      if (result && typeof result === 'object') {
        message = result;
      }
    }
    
    // Get handler
    const handler = this.handlers.get(message.type);
    if (!handler) {
      throw new Error(\`No handler for message type: \${message.type}\`);
    }
    
    // Process message
    const response = await handler(message);
    
    // Emit event
    this.emit('message:processed', {
      message,
      response,
      timestamp: Date.now()
    });
    
    return response;
  }
}

module.exports = { 
  processMessage: async (message) => {
    const processor = new MessageProcessor();
    return processor.processMessage(message);
  },
  MessageProcessor 
};
`,
    'src/services/realtimeService.js': `
export class RealtimeService {
  constructor(wsUrl) {
    this.url = wsUrl;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve(this);
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
    });
  }
  
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      const listeners = this.listeners.get(message.type) || [];
      
      listeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
  
  on(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }
  
  send(type, data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }
}
`
  };
  
  // Write all files
  Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(testDir, filePath);
    writeFileSync(fullPath, content);
  });
  
  return testDir;
}

// Run tests
async function runTests(interactive = false) {
  console.log('🧪 Smart Context MCP - Comprehensive Test Suite\n');
  
  // Initialize
  await initDatabase();
  const testDir = createTestProject();
  
  // Initialize components
  const scanner = new FileScanner(testDir);
  const analyzer = new ContextAnalyzer(testDir);
  const semanticSearch = new SemanticSearch();
  const queryEnhancer = new QueryEnhancer();
  
  // Scan files
  console.log('📁 Scanning test project...');
  const files = scanner.scanCodebase();
  console.log(`Found ${files.length} files\n`);
  
  const results = [];
  
  // Run each test case
  for (const testCase of TEST_CASES) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Test: ${testCase.id}`);
    console.log(`   ${testCase.description}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Expected: ${testCase.expectedFiles.join(', ')}`);
    console.log('='.repeat(80));
    
    // Enhance query
    const enhanced = queryEnhancer.enhanceQuery(testCase.query);
    
    // Analyze query
    const queryAnalysis = semanticSearch.analyzeQuery(testCase.query);
    
    // Get context
    const context = await analyzer.getOptimalContext({
      task: testCase.query,
      projectFiles: files,
      targetTokens: 8000,
      minRelevanceScore: 0.15
    });
    
    // Calculate success
    const foundFiles = context.included.map(f => path.basename(f.path));
    const expectedFound = testCase.expectedFiles.filter(expected => 
      foundFiles.some(found => found === expected)
    );
    const successRate = expectedFound.length / testCase.expectedFiles.length;
    
    const result = {
      testCase,
      foundFiles,
      expectedFound,
      successRate,
      included: context.included.length,
      topScore: context.included[0]?.score || 0
    };
    
    results.push(result);
    
    // Display results
    console.log('\n📊 Results:');
    console.log(`   Files found: ${context.included.length}`);
    console.log(`   Success rate: ${(successRate * 100).toFixed(0)}%`);
    console.log(`   Top score: ${result.topScore.toFixed(2)}`);
    
    if (context.included.length > 0) {
      console.log('\n   Top 5 matches:');
      context.included.slice(0, 5).forEach((file, i) => {
        const basename = path.basename(file.path);
        const isExpected = testCase.expectedFiles.includes(basename);
        console.log(`   ${i + 1}. ${basename} (${(file.score * 100).toFixed(0)}%) ${isExpected ? '✅' : ''}`);
        if (file.reasons.length > 0) {
          console.log(`      Reasons: ${file.reasons.slice(0, 3).join(', ')}`);
        }
      });
    }
    
    // Show query enhancement
    console.log('\n🔍 Query Enhancement:');
    console.log(`   Function hints: ${enhanced.functionHints.slice(0, 5).join(', ')}${enhanced.functionHints.length > 5 ? '...' : ''}`);
    console.log(`   File hints: ${enhanced.fileHints.join(', ')}`);
    console.log(`   Patterns: ${enhanced.patterns.join(', ')}`);
    
    if (interactive) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      await new Promise(resolve => {
        rl.question('\nPress Enter to continue...', () => {
          rl.close();
          resolve();
        });
      });
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📈 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const totalTests = results.length;
  const perfectScores = results.filter(r => r.successRate === 1).length;
  const partialScores = results.filter(r => r.successRate > 0 && r.successRate < 1).length;
  const failedTests = results.filter(r => r.successRate === 0).length;
  const avgSuccess = results.reduce((sum, r) => sum + r.successRate, 0) / totalTests;
  
  console.log(`\nTotal tests: ${totalTests}`);
  console.log(`Perfect matches: ${perfectScores} (${(perfectScores/totalTests*100).toFixed(0)}%)`);
  console.log(`Partial matches: ${partialScores} (${(partialScores/totalTests*100).toFixed(0)}%)`);
  console.log(`Failed: ${failedTests} (${(failedTests/totalTests*100).toFixed(0)}%)`);
  console.log(`Average success rate: ${(avgSuccess * 100).toFixed(0)}%`);
  
  console.log('\nDetailed Results:');
  results.forEach(r => {
    const status = r.successRate === 1 ? '✅' : r.successRate > 0 ? '⚠️' : '❌';
    console.log(`${status} ${r.testCase.id}: ${(r.successRate * 100).toFixed(0)}% - Found ${r.expectedFound.length}/${r.testCase.expectedFiles.length} expected files`);
  });
  
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
  
  return results;
}

// Check if running as script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const interactive = process.argv.includes('--interactive') || process.argv.includes('-i');
  runTests(interactive).catch(console.error);
}

export { runTests, TEST_CASES };