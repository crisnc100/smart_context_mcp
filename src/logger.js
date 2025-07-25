// Logger that doesn't interfere with MCP stdio communication
// In production, this could write to a file or use a proper logging service

import fs from 'fs';
import path from 'path';
import os from 'os';

// Use a log file in temp directory
const logFile = process.env.SMART_CONTEXT_LOG_FILE || 
  path.join(os.tmpdir(), 'smart-context-mcp.log');

// Simple no-op logger for MCP compatibility
const logger = {
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  
  // Enable file logging if needed for debugging
  enableFileLogging: () => {
    const writeLog = (level, ...args) => {
      const timestamp = new Date().toISOString();
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      try {
        fs.appendFileSync(logFile, `[${timestamp}] [${level}] ${message}\n`);
      } catch (err) {
        // Silently fail - we can't use console in MCP
      }
    };
    
    logger.log = (...args) => writeLog('LOG', ...args);
    logger.debug = (...args) => writeLog('DEBUG', ...args);
    logger.info = (...args) => writeLog('INFO', ...args);
    logger.warn = (...args) => writeLog('WARN', ...args);
    logger.error = (...args) => writeLog('ERROR', ...args);
  }
};

// Enable file logging if DEBUG environment variable is set
if (process.env.SMART_CONTEXT_DEBUG) {
  logger.enableFileLogging();
  logger.info('Smart Context MCP Server logging enabled');
  logger.info('Log file:', logFile);
}

export default logger;