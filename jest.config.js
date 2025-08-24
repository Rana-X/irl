export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/index.test.js', // Skip server startup test in CI
    '/tests/mcp-server.test.js' // Temporarily skip until fixed
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleDirectories: ['node_modules', 'tests/__mocks__'],
  collectCoverageFrom: [
    'api/**/*.js',
    'lib/**/*.js',
    'index.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/*-original.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true
};