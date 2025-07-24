import { readFileSync, existsSync } from 'fs';
import path from 'path';

class ConfigLoader {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPaths = [
      path.join(process.cwd(), 'config', 'default.json'),
      path.join(process.cwd(), 'config', 'local.json'),
      path.join(process.cwd(), '.smart-context-config.json')
    ];

    let config = {};

    // Load default config
    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const fileContent = readFileSync(configPath, 'utf-8');
          const fileConfig = JSON.parse(fileContent);
          config = this.deepMerge(config, fileConfig);
          console.debug(`Loaded config from ${configPath}`);
        } catch (error) {
          console.error(`Failed to load config from ${configPath}:`, error.message);
        }
      }
    }

    // Override with environment variables
    config = this.applyEnvironmentOverrides(config);

    return config;
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  applyEnvironmentOverrides(config) {
    const envMappings = {
      'SMART_CONTEXT_TOKEN_BUDGET': 'context.defaultTokenBudget',
      'SMART_CONTEXT_MIN_RELEVANCE': 'context.minRelevanceScore',
      'SMART_CONTEXT_LEARNING_RATE': 'learning.learningRate',
      'SMART_CONTEXT_MAX_FILE_SIZE': 'fileScanning.maxFileSize',
      'SMART_CONTEXT_CACHE_EXPIRY': 'database.cacheExpiry',
      'SMART_CONTEXT_GIT_COMMIT_LIMIT': 'git.defaultCommitLimit'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      if (process.env[envVar]) {
        this.setNestedValue(config, configPath, process.env[envVar]);
      }
    }

    return config;
  }

  setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    // Try to parse as number or boolean
    if (!isNaN(value)) {
      current[parts[parts.length - 1]] = Number(value);
    } else if (value === 'true' || value === 'false') {
      current[parts[parts.length - 1]] = value === 'true';
    } else {
      current[parts[parts.length - 1]] = value;
    }
  }

  get(path, defaultValue = undefined) {
    const parts = path.split('.');
    let current = this.config;
    
    for (const part of parts) {
      if (current && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  getAll() {
    return { ...this.config };
  }
}

// Export singleton instance
export const config = new ConfigLoader();
export default config;