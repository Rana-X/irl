#!/usr/bin/env node

/**
 * E2B Test Runner for MCP SF Cleaning Service
 * 
 * This script sets up and runs the test suite in an E2B sandbox environment
 * It handles ESM modules, environment variables, and test execution
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper to print colored messages
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

// Check if running in E2B environment
const isE2B = () => {
  return process.env.E2B_SANDBOX === 'true' || 
         process.env.E2B === 'true' ||
         existsSync('/.e2b');
};

// Setup test environment
async function setupEnvironment() {
  log.header('Setting Up Test Environment');
  
  // Set test environment variables if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
    log.info('Set NODE_ENV=test');
  }
  
  if (!process.env.RESEND_API_KEY) {
    process.env.RESEND_API_KEY = 'test_key';
    log.info('Set RESEND_API_KEY=test_key');
  }
  
  if (!process.env.FROM_EMAIL) {
    process.env.FROM_EMAIL = 'test@example.com';
    log.info('Set FROM_EMAIL=test@example.com');
  }
  
  if (!process.env.PARTNER_EMAILS) {
    process.env.PARTNER_EMAILS = 'partner@example.com';
    log.info('Set PARTNER_EMAILS=partner@example.com');
  }
  
  // Check if we're in E2B
  if (isE2B()) {
    log.success('Running in E2B sandbox environment');
  } else {
    log.warning('Not running in E2B sandbox - running locally');
  }
  
  // Check Node version
  const nodeVersion = process.version;
  log.info(`Node version: ${nodeVersion}`);
  
  if (!nodeVersion.startsWith('v20') && !nodeVersion.startsWith('v18')) {
    log.warning('Tests are optimized for Node.js 18+ with ESM support');
  }
}

// Check dependencies
async function checkDependencies() {
  log.header('Checking Dependencies');
  
  try {
    // Check if node_modules exists
    await fs.access(join(__dirname, 'node_modules'));
    log.success('node_modules directory found');
  } catch {
    log.warning('node_modules not found - installing dependencies...');
    await runCommand('npm', ['install']);
  }
  
  // Check if Jest is installed
  try {
    await fs.access(join(__dirname, 'node_modules', 'jest'));
    log.success('Jest is installed');
  } catch {
    log.error('Jest not found - please run npm install');
    process.exit(1);
  }
}

// Run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...options.env },
      ...options
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

// Run the tests
async function runTests() {
  log.header('Running Test Suite');
  
  const testCommand = 'npx';
  const testArgs = [
    'jest',
    '--coverage',
    '--verbose',
    '--colors',
    '--detectOpenHandles',
    '--forceExit'
  ];
  
  // Add ESM support for Node
  const env = {
    ...process.env,
    NODE_OPTIONS: '--experimental-vm-modules'
  };
  
  log.info('Executing: NODE_OPTIONS=--experimental-vm-modules npx jest --coverage --verbose');
  
  try {
    await runCommand(testCommand, testArgs, { env });
    log.success('All tests completed successfully!');
    return 0;
  } catch (error) {
    log.error('Test suite failed');
    return 1;
  }
}

// Generate test report
async function generateReport() {
  log.header('Test Report');
  
  try {
    // Check if coverage report exists
    const coverageDir = join(__dirname, 'coverage');
    await fs.access(coverageDir);
    
    // Read coverage summary
    const summaryPath = join(coverageDir, 'coverage-summary.json');
    const summaryData = await fs.readFile(summaryPath, 'utf-8');
    const summary = JSON.parse(summaryData);
    
    // Print coverage summary
    log.info('Coverage Summary:');
    const total = summary.total;
    console.log(`  Statements: ${total.statements.pct}%`);
    console.log(`  Branches: ${total.branches.pct}%`);
    console.log(`  Functions: ${total.functions.pct}%`);
    console.log(`  Lines: ${total.lines.pct}%`);
    
    // Check if coverage meets thresholds
    const thresholds = {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    };
    
    let meetsCoverage = true;
    for (const [key, threshold] of Object.entries(thresholds)) {
      if (total[key].pct < threshold) {
        log.warning(`Coverage for ${key} (${total[key].pct}%) is below threshold (${threshold}%)`);
        meetsCoverage = false;
      }
    }
    
    if (meetsCoverage) {
      log.success('All coverage thresholds met!');
    }
    
  } catch (error) {
    log.warning('Coverage report not available');
  }
}

// Main execution
async function main() {
  console.log(`
${colors.bright}${colors.cyan}╔══════════════════════════════════════════════╗
║   E2B Test Runner - MCP SF Cleaning Service   ║
╚══════════════════════════════════════════════╝${colors.reset}
`);
  
  try {
    // Setup
    await setupEnvironment();
    await checkDependencies();
    
    // Run tests
    const exitCode = await runTests();
    
    // Generate report
    await generateReport();
    
    // Final status
    log.header('Test Run Complete');
    
    if (exitCode === 0) {
      log.success('✨ All tests passed successfully!');
      if (isE2B()) {
        log.info('Tests validated in E2B sandbox environment');
      }
    } else {
      log.error('Some tests failed - please review the output above');
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    log.error(`Test runner failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test suite
main().catch(console.error);