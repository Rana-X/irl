/**
 * Jest setup file - runs before all tests
 * Configures mocks and test environment
 */
import { jest } from '@jest/globals';

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.FROM_EMAIL = process.env.FROM_EMAIL || 'gwen@irl-concierge.com';
process.env.PARTNER_EMAILS = process.env.PARTNER_EMAILS || 'partner@example.com';

// Global test timeout
jest.setTimeout(10000);

// Mock fetch globally for Node.js versions that don't have it
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Export mock helpers
export const mockResendSuccess = () => {
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
};

export const mockResendFailure = (error) => {
  jest.mock('resend', () => ({
    Resend: jest.fn(() => ({
      emails: {
        send: jest.fn(async () => ({
          data: null,
          error: error || { message: 'Email send failed' }
        }))
      }
    }))
  }));
};