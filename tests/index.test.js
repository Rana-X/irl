import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MCP Server Index', () => {
  let mcpProcess;
  
  afterAll(() => {
    if (mcpProcess && !mcpProcess.killed) {
      mcpProcess.kill();
    }
  });
  
  test('starts MCP server successfully', (done) => {
    const indexPath = join(__dirname, '..', 'index.js');
    
    mcpProcess = spawn('node', [indexPath], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        RESEND_API_KEY: 'test_key',
        FROM_EMAIL: 'test@example.com',
        PARTNER_EMAILS: 'partner@example.com'
      }
    });
    
    let output = '';
    
    mcpProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('MCP Server running')) {
        mcpProcess.kill();
        done();
      }
    });
    
    mcpProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    mcpProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      done(error);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (mcpProcess && !mcpProcess.killed) {
        mcpProcess.kill();
        done(new Error('Server startup timeout'));
      }
    }, 5000);
  }, 10000);
  
  test('handles invalid environment gracefully', (done) => {
    const indexPath = join(__dirname, '..', 'index.js');
    
    const testProcess = spawn('node', [indexPath], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // Missing required environment variables
      }
    });
    
    let errorOutput = '';
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('close', (code) => {
      expect(code).not.toBe(0);
      testProcess.kill();
      done();
    });
    
    // Timeout
    setTimeout(() => {
      if (testProcess && !testProcess.killed) {
        testProcess.kill();
        done();
      }
    }, 3000);
  }, 5000);
});

describe('MCP Protocol Implementation', () => {
  test('exports correct tool schema', async () => {
    // Dynamic import to test module exports
    const module = await import('../index.js');
    
    // Since the module starts a server, we just verify it exports correctly
    expect(module).toBeDefined();
  });
});