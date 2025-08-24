# E2B Sandbox Template for MCP SF Cleaning Service Testing
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Set environment variables for testing
ENV NODE_ENV=test
ENV RESEND_API_KEY=test_key
ENV FROM_EMAIL=test@example.com
ENV PARTNER_EMAILS=partner@example.com

# Make test runner executable
RUN chmod +x run-tests-e2b.js

# Default command runs the E2B test suite
CMD ["node", "run-tests-e2b.js"]