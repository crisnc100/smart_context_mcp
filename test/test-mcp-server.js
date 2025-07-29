#!/usr/bin/env node

// Test the MCP server with actual requests

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start the MCP server
const server = spawn('node', [path.join(__dirname, '../src/index.js')], {
  env: { ...process.env, PROJECT_ROOT: path.join(__dirname, '..') },
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';

server.stdout.on('data', (data) => {
  const text = data.toString();
  outputBuffer += text;
  
  // Look for initialization message
  if (text.includes('"method":"initialized"')) {
    console.log('✅ Server initialized successfully');
    
    // Send a test request
    const testRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_optimal_context',
        arguments: {
          task: 'exercise naming formatting variation names',
          targetTokens: 8000
        }
      }
    };
    
    server.stdin.write(JSON.stringify(testRequest) + '\n');
  }
  
  // Look for response
  if (text.includes('"id":1') && text.includes('result')) {
    try {
      const lines = outputBuffer.split('\n');
      for (const line of lines) {
        if (line.includes('"id":1')) {
          const response = JSON.parse(line);
          console.log('\n📊 Got response from server:');
          
          if (response.result?.content) {
            const content = JSON.parse(response.result.content);
            console.log(`   Files included: ${content.included?.length || 0}`);
            console.log(`   Total tokens: ${content.totalTokens || 0}`);
            
            if (content.included?.length > 0) {
              console.log('\n   Top 5 files:');
              content.included.slice(0, 5).forEach((file, i) => {
                console.log(`   ${i + 1}. ${file.path} (${(file.score * 100).toFixed(0)}%)`);
              });
            }
            
            if (content.queryAnalysis) {
              console.log('\n   Query analysis:');
              console.log(`   - Function hints: ${content.queryAnalysis.functionHints?.slice(0, 5).join(', ')}...`);
              console.log(`   - Concepts: ${content.queryAnalysis.concepts?.slice(0, 5).join(', ')}...`);
            }
          }
          
          console.log('\n✅ MCP server is working correctly!');
          server.kill();
          process.exit(0);
        }
      }
    } catch (e) {
      // Continue accumulating
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Send initialization
setTimeout(() => {
  const initMsg = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '1.0',
      capabilities: {}
    },
    id: 0
  };
  
  server.stdin.write(JSON.stringify(initMsg) + '\n');
}, 100);

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Test timed out');
  server.kill();
  process.exit(1);
}, 10000);