import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createServer } from 'http';
import handler from '../api/mcp.js';
import { wrapHandler } from '../api/mcp-wrapper.js';

// Create a test server for the API handler
const createTestServer = (port = 0) => {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      if (req.method !== 'POST' || req.url !== '/api/mcp') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          req.body = JSON.parse(body);
          const wrappedHandler = wrapHandler(handler);
          await wrappedHandler(req, res);
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    });
    
    server.listen(port, () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
    
    server.on('error', reject);
  });
};

// Helper to make requests to test server
const makeRequest = async (port, data) => {
  const response = await fetch(`http://localhost:${port}/api/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  const responseData = await response.json();
  return { status: response.status, data: responseData };
};

describe('API Integration Tests', () => {
  let testServer;
  let port;
  
  beforeAll(async () => {
    // Set up test environment variables
    process.env.RESEND_API_KEY = 'test_key';
    process.env.FROM_EMAIL = 'test@example.com';
    process.env.PARTNER_EMAILS = 'partner@example.com';
    
    // Create test server
    const serverInfo = await createTestServer();
    testServer = serverInfo.server;
    port = serverInfo.port;
  });
  
  afterAll(async () => {
    // Close test server
    if (testServer) {
      await new Promise(resolve => testServer.close(resolve));
    }
  });
  
  describe('POST /api/mcp - tools/list', () => {
    test('returns tool list successfully', async () => {
      const response = await makeRequest(port, { method: 'tools/list' });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('tools');
      expect(response.data.tools).toBeInstanceOf(Array);
      expect(response.data.tools[0]).toHaveProperty('name', 'request_cleaning');
    });
    
    test('handles OPTIONS preflight', async () => {
      const response = await fetch(`http://localhost:${port}/api/mcp`, {
        method: 'OPTIONS'
      });
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('POST /api/mcp - tools/call', () => {
    test('accepts valid SF request', async () => {
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'John Doe',
            phone: '4155551234',
            address: '123 Market St, San Francisco, CA 94105'
          }
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data.content[0].text).toContain('Sent');
    });
    
    test('rejects non-SF address', async () => {
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Jane Doe',
            phone: '5105551234',
            address: '456 Broadway, Oakland, CA 94607'
          }
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.content[0].text).toContain('Sorry, we only serve San Francisco');
    });
    
    test('validates phone number format', async () => {
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test User',
            phone: '123',
            address: '789 Pine St, SF'
          }
        }
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('Invalid phone number');
    });
    
    test('requires all fields', async () => {
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test User',
            phone: '4155551234'
            // missing address
          }
        }
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Missing required fields');
    });
    
    test('sanitizes XSS attempts', async () => {
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: '<script>alert("XSS")</script>',
            phone: '4155551234',
            address: '123 Market St, SF'
          }
        }
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Invalid name');
    });
  });
  
  describe('Error Handling', () => {
    test('handles invalid JSON', async () => {
      const response = await fetch(`http://localhost:${port}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid JSON');
    });
    
    test('handles unknown methods', async () => {
      const response = await makeRequest(port, { method: 'unknown/method' });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Unknown method');
    });
    
    test('handles GET requests', async () => {
      const response = await fetch(`http://localhost:${port}/api/mcp`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(405);
    });
    
    test('handles large payloads', async () => {
      const largePayload = {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'a'.repeat(10000),
            phone: '4155551234',
            address: '123 Market St, SF'
          }
        }
      };
      
      const response = await makeRequest(port, largePayload);
      expect(response.status).toBe(413);
    });
  });
  
  describe('Rate Limiting', () => {
    test('enforces rate limits', async () => {
      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(makeRequest(port, { method: 'tools/list' }));
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    }, 10000); // Increase timeout for rate limit test
  });
  
  describe('Security Headers', () => {
    test('sets security headers', async () => {
      const response = await fetch(`http://localhost:${port}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'tools/list' })
      });
      
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('content-security-policy')).toBeDefined();
    });
  });
});

describe('API Performance Tests', () => {
  let testServer;
  let port;
  
  beforeAll(async () => {
    const serverInfo = await createTestServer();
    testServer = serverInfo.server;
    port = serverInfo.port;
  });
  
  afterAll(async () => {
    if (testServer) {
      await new Promise(resolve => testServer.close(resolve));
    }
  });
  
  test('responds within acceptable time', async () => {
    const start = Date.now();
    
    await makeRequest(port, { method: 'tools/list' });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });
  
  test('handles concurrent requests', async () => {
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(makeRequest(port, { method: 'tools/list' }));
    }
    
    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;
    
    expect(responses.every(r => r.status === 200 || r.status === 429)).toBe(true);
    expect(duration).toBeLessThan(5000); // Should handle 10 requests within 5 seconds
  });
});