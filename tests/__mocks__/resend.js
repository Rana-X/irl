/**
 * Mock implementation of Resend API for testing
 * This replaces the real Resend module during tests
 */

class MockResend {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.sentEmails = [];
    this.shouldFail = false;
    this.failureError = null;
  }

  // Mock the emails.send method
  emails = {
    send: async (emailData) => {
      // Store the email data for verification in tests
      this.sentEmails.push(emailData);
      
      // Simulate API key validation
      if (!this.apiKey || this.apiKey === 'invalid_key') {
        return {
          error: {
            statusCode: 401,
            name: 'validation_error',
            message: 'API key is invalid'
          }
        };
      }
      
      // Simulate failure if configured
      if (this.shouldFail) {
        return {
          error: this.failureError || {
            statusCode: 500,
            name: 'internal_error',
            message: 'Failed to send email'
          }
        };
      }
      
      // Simulate successful email send
      return {
        data: {
          id: `mock-email-${Date.now()}`,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject
        },
        error: null
      };
    }
  };
  
  // Helper methods for testing
  _reset() {
    this.sentEmails = [];
    this.shouldFail = false;
    this.failureError = null;
  }
  
  _setFailure(shouldFail, error = null) {
    this.shouldFail = shouldFail;
    this.failureError = error;
  }
  
  _getSentEmails() {
    return this.sentEmails;
  }
  
  _getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }
}

// Export for both CommonJS and ESM
export const Resend = MockResend;
export default MockResend;