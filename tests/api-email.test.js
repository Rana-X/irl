import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createServer } from 'http';
import { wrapHandler } from '../api/mcp-wrapper.js';

// Manual mock for Resend
let mockResendInstance;
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'mock-email-id' },
        error: null
      })
    }
  }))
}));

// Import handler after mocking
import handler from '../api/mcp.js';

describe('API Email Functionality Tests', () => {
  let testServer;
  let port;
  let mockResendInstance;
  
  // Create test server
  const createTestServer = () => {
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
          
          // Simulate large payload rejection
          if (body.length > 100000) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            req.destroy();
          }
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
      
      server.listen(0, () => {
        const address = server.address();
        resolve({ server, port: address.port });
      });
      
      server.on('error', reject);
    });
  };
  
  // Helper to make requests
  const makeRequest = async (port, data) => {
    const response = await fetch(`http://localhost:${port}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const responseData = await response.json();
    return { status: response.status, data: responseData };
  };
  
  beforeEach(async () => {
    // Set up test environment
    process.env.RESEND_API_KEY = 'test_valid_key';
    process.env.FROM_EMAIL = 'gwen@irl-concierge.com';
    process.env.PARTNER_EMAILS = 'partner@example.com';
    
    // Create test server
    const serverInfo = await createTestServer();
    testServer = serverInfo.server;
    port = serverInfo.port;
    
    // Get mock instance for verification
    const { Resend } = await import('resend');
    mockResendInstance = new Resend.mock.results[0].value;
  });
  
  afterEach(async () => {
    // Clean up
    if (testServer) {
      await new Promise(resolve => testServer.close(resolve));
    }
    jest.clearAllMocks();
  });
  
  describe('Email Sending with SF Address', () => {
    test('sends email successfully for valid SF request', async () => {
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
      expect(response.data.content[0].text).toContain('Sent');
      
      // Verify email was "sent" via mock
      const sentEmails = mockResendInstance._getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].from).toBe('gwen@irl-concierge.com');
      expect(sentEmails[0].to).toContain('partner@example.com');
      expect(sentEmails[0].subject).toContain('New Cleaning Request');
    });
    
    test('includes correct details in email body', async () => {
      await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Jane Smith',
            phone: '4155559999',
            address: '456 Pine St, SF 94108'
          }
        }
      });
      
      const lastEmail = mockResendInstance._getLastEmail();
      expect(lastEmail.html).toContain('Jane Smith');
      expect(lastEmail.html).toContain('415-555-9999');
      expect(lastEmail.html).toContain('456 Pine St, SF 94108');
    });
    
    test('handles email sending failure gracefully', async () => {
      // Configure mock to fail
      mockResendInstance._setFailure(true, {
        statusCode: 503,
        name: 'service_unavailable',
        message: 'Service temporarily unavailable'
      });
      
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test User',
            phone: '4155551234',
            address: '789 Market St, SF'
          }
        }
      });
      
      expect(response.status).toBe(500);
      expect(response.data.error).toContain('Failed to send booking request');
    });
    
    test('handles invalid API key', async () => {
      // Set invalid API key
      process.env.RESEND_API_KEY = 'invalid_key';
      
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test User',
            phone: '4155551234',
            address: '123 Main St, SF'
          }
        }
      });
      
      expect(response.status).toBe(500);
      expect(response.data.error).toContain('Failed to send booking request');
    });
  });
  
  describe('Non-SF Address Handling', () => {
    test('does not send email for non-SF address', async () => {
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Bob Johnson',
            phone: '5105551234',
            address: '123 Broadway, Oakland, CA'
          }
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.content[0].text).toContain('Sorry, we only serve San Francisco');
      
      // Verify no email was sent
      const sentEmails = mockResendInstance._getSentEmails();
      expect(sentEmails).toHaveLength(0);
    });
  });
  
  describe('Multiple Partner Emails', () => {
    test('sends to multiple partners when configured', async () => {
      // Set multiple partner emails
      process.env.PARTNER_EMAILS = 'partner1@example.com,partner2@example.com,partner3@example.com';
      
      const response = await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Multi Test',
            phone: '4155551234',
            address: '999 Market St, SF'
          }
        }
      });
      
      expect(response.status).toBe(200);
      
      const lastEmail = mockResendInstance._getLastEmail();
      expect(lastEmail.to).toEqual([
        'partner1@example.com',
        'partner2@example.com',
        'partner3@example.com'
      ]);
    });
  });
  
  describe('Email Content Validation', () => {
    test('sanitizes HTML in customer input', async () => {
      await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test<script>alert("XSS")</script>User',
            phone: '4155551234',
            address: '123 Safe St, SF'
          }
        }
      });
      
      const lastEmail = mockResendInstance._getLastEmail();
      expect(lastEmail.html).not.toContain('<script>');
      expect(lastEmail.html).not.toContain('alert(');
      expect(lastEmail.html).toContain('TestUser');
    });
    
    test('formats phone number in email', async () => {
      await makeRequest(port, {
        method: 'tools/call',
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Format Test',
            phone: '4155551234', // Raw number
            address: '321 Market St, SF'
          }
        }
      });
      
      const lastEmail = mockResendInstance._getLastEmail();
      expect(lastEmail.html).toContain('415-555-1234'); // Formatted
    });
  });
});