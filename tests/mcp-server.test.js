import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  StdioServerTransport: jest.fn(() => ({
    start: jest.fn()
  })),
  Server: jest.fn(() => {
    const emitter = new EventEmitter();
    return {
      setRequestHandler: jest.fn((type, handler) => {
        emitter.on(type, handler);
      }),
      connect: jest.fn(async (transport) => {
        return Promise.resolve();
      }),
      _emit: (type, request) => {
        return new Promise((resolve) => {
          emitter.emit(type, request, {
            send: resolve
          });
        });
      }
    };
  })
}));

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn(async () => ({
        data: { id: 'mock-email-id' },
        error: null
      }))
    }
  }))
}));

// Mock dotenv
jest.mock('dotenv/config', () => ({}), { virtual: true });

describe('MCP Server Tests', () => {
  let server;
  let mockConsoleLog;
  let mockConsoleError;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock console
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    
    // Set environment variables
    process.env.RESEND_API_KEY = 'test_key';
    process.env.FROM_EMAIL = 'gwen@irl-concierge.com';
    process.env.PARTNER_EMAILS = 'partner@example.com';
  });
  
  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });
  
  describe('Server Initialization', () => {
    test('creates MCP server with correct configuration', async () => {
      // Import the module (this runs the server setup)
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      // Dynamically import index.js which will use our mocked modules
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      // Verify server was created
      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'sf-cleaning',
          version: '1.0.0'
        })
      );
    });
    
    test('registers all required request handlers', async () => {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      const serverInstance = Server.mock.results[0].value;
      
      // Check that handlers were registered
      expect(serverInstance.setRequestHandler).toHaveBeenCalledWith(
        'tools/list',
        expect.any(Function)
      );
      expect(serverInstance.setRequestHandler).toHaveBeenCalledWith(
        'tools/call',
        expect.any(Function)
      );
    });
  });
  
  describe('Tools List Handler', () => {
    test('returns correct tool schema', async () => {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      const serverInstance = Server.mock.results[0].value;
      
      // Simulate tools/list request
      const response = await serverInstance._emit('tools/list', {});
      
      expect(response).toEqual({
        tools: [{
          name: 'request_cleaning',
          description: 'Request a cleaning service for a San Francisco address',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Customer name'
              },
              phone: {
                type: 'string',
                description: 'Contact phone number'
              },
              address: {
                type: 'string',
                description: 'Service address in San Francisco'
              }
            },
            required: ['name', 'phone', 'address']
          }
        }]
      });
    });
  });
  
  describe('Tools Call Handler', () => {
    let serverInstance;
    
    beforeEach(async () => {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      serverInstance = Server.mock.results[0].value;
    });
    
    test('handles valid SF cleaning request', async () => {
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'John Doe',
            phone: '4155551234',
            address: '123 Market St, San Francisco, CA'
          }
        }
      });
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: expect.stringContaining('✅ Sent!')
        }]
      });
    });
    
    test('rejects non-SF address', async () => {
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Jane Doe',
            phone: '5105551234',
            address: '456 Broadway, Oakland, CA'
          }
        }
      });
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: expect.stringContaining('Sorry, we only serve San Francisco')
        }]
      });
    });
    
    test('validates required fields', async () => {
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test User',
            phone: '4155551234'
            // missing address
          }
        }
      });
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: expect.stringContaining('Missing required field')
        }]
      });
    });
    
    test('handles invalid phone number', async () => {
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test User',
            phone: '123', // Invalid
            address: '789 Market St, SF'
          }
        }
      });
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: expect.stringContaining('Invalid phone number')
        }]
      });
    });
    
    test('handles unknown tool', async () => {
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      });
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: expect.stringContaining('Unknown tool')
        }]
      });
    });
    
    test('handles email sending failure', async () => {
      // Mock Resend to fail
      const { Resend } = await import('resend');
      Resend.mockImplementation(() => ({
        emails: {
          send: jest.fn(async () => ({
            data: null,
            error: { message: 'Email service down' }
          }))
        }
      }));
      
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test User',
            phone: '4155551234',
            address: '123 Market St, SF'
          }
        }
      });
      
      expect(response).toEqual({
        content: [{
          type: 'text',
          text: expect.stringContaining('Failed to send')
        }]
      });
    });
  });
  
  describe('Environment Variables', () => {
    test('handles missing RESEND_API_KEY', async () => {
      delete process.env.RESEND_API_KEY;
      
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Missing RESEND_API_KEY')
      );
    });
    
    test('handles missing FROM_EMAIL', async () => {
      delete process.env.FROM_EMAIL;
      
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      const serverInstance = Server.mock.results[0].value;
      
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test',
            phone: '4155551234',
            address: '123 Market St, SF'
          }
        }
      });
      
      expect(response.content[0].text).toContain('not configured');
    });
    
    test('handles missing PARTNER_EMAILS', async () => {
      delete process.env.PARTNER_EMAILS;
      
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      const serverInstance = Server.mock.results[0].value;
      
      const response = await serverInstance._emit('tools/call', {
        params: {
          name: 'request_cleaning',
          arguments: {
            name: 'Test',
            phone: '4155551234',
            address: '123 Market St, SF'
          }
        }
      });
      
      expect(response.content[0].text).toContain('not configured');
    });
  });
  
  describe('Server Lifecycle', () => {
    test('starts server transport', async () => {
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/index.js');
      
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      const transport = StdioServerTransport.mock.results[0].value;
      expect(transport.start).toHaveBeenCalled();
    });
    
    test('logs server startup message', async () => {
      jest.isolateModules(async () => {
        await import('../index.js');
      });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('MCP Server running')
      );
    });
  });
});