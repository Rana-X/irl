#!/usr/bin/env node

/**
 * E2B Sandbox Test Runner for MCP SF Cleaning Service
 * 
 * This script creates an E2B sandbox and runs the test suite inside it
 * Requires E2B_API_KEY to be set in .env file
 */

import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

async function runTestsInSandbox() {
  log.header('E2B Sandbox Test Runner');
  
  // Check for API key
  if (!process.env.E2B_API_KEY || process.env.E2B_API_KEY === 'e2b_YOUR_API_KEY_HERE') {
    log.error('E2B_API_KEY not configured in .env file');
    log.info('Get your API key from: https://e2b.dev/dashboard');
    process.exit(1);
  }
  
  let sandbox = null;
  
  try {
    // Create sandbox
    log.info('Creating E2B sandbox...');
    sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeout: 300000 // 5 minutes
    });
    log.success(`Sandbox created with ID: ${sandbox.id}`);
    
    // Upload project files
    log.info('Uploading project files to sandbox...');
    
    // Read and upload package.json
    const packageJson = readFileSync(join(__dirname, 'package.json'), 'utf-8');
    await sandbox.files.write('/app/package.json', packageJson);
    
    // Read and upload package-lock.json
    const packageLock = readFileSync(join(__dirname, 'package-lock.json'), 'utf-8');
    await sandbox.files.write('/app/package-lock.json', packageLock);
    
    // Upload source files
    const filesToUpload = [
      'index.js',
      'jest.config.js',
      '.env',
      'api/mcp.js',
      'api/mcp-wrapper.js',
      'api/mcp-production.js',
      'api/mcp-original.js',
      'lib/validators.js',
      'tests/validators.test.js',
      'tests/api.integration.test.js',
      'tests/security.test.js',
      'tests/edge-cases.test.js',
      'tests/api-email.test.js',
      'tests/mcp-server.test.js',
      'tests/setup.js',
      'tests/__mocks__/resend.js'
    ];
    
    // Create directories first
    await sandbox.runCode(`
import os
os.makedirs('/app/api', exist_ok=True)
os.makedirs('/app/lib', exist_ok=True)
os.makedirs('/app/tests', exist_ok=True)
os.makedirs('/app/tests/__mocks__', exist_ok=True)
print("Directories created")
    `);
    
    for (const file of filesToUpload) {
      try {
        const content = readFileSync(join(__dirname, file), 'utf-8');
        await sandbox.files.write(`/app/${file}`, content);
        log.info(`Uploaded: ${file}`);
      } catch (err) {
        log.warning(`Skipped: ${file} (${err.message})`);
      }
    }
    
    // Install dependencies in sandbox
    log.info('Installing dependencies in sandbox...');
    const npmInstall = await sandbox.runCode(`
import subprocess
result = subprocess.run(['npm', 'install'], 
                       cwd='/app', 
                       capture_output=True, 
                       text=True)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
print("Return code:", result.returncode)
    `);
    
    if (npmInstall.error) {
      log.error('Failed to install dependencies:');
      console.error(npmInstall.error);
    } else {
      log.success('Dependencies installed successfully');
      console.log(npmInstall.logs);
    }
    
    // Set up environment variables
    log.info('Setting up test environment variables...');
    const setupEnv = await sandbox.runCode(`
import os
os.environ['NODE_ENV'] = 'test'
os.environ['RESEND_API_KEY'] = 'test_key'
os.environ['FROM_EMAIL'] = 'test@example.com'
os.environ['PARTNER_EMAILS'] = 'partner@example.com'
print("Environment variables set:")
for key in ['NODE_ENV', 'RESEND_API_KEY', 'FROM_EMAIL', 'PARTNER_EMAILS']:
    print(f"  {key}={os.environ.get(key)}")
    `);
    console.log(setupEnv.logs);
    
    // Run tests
    log.header('Running Tests in Sandbox');
    const testRun = await sandbox.runCode(`
import subprocess
import json

# Run Jest with coverage
result = subprocess.run(
    ['npx', 'jest', '--coverage', '--json', '--outputFile=/app/test-results.json'],
    cwd='/app',
    capture_output=True,
    text=True,
    env={**os.environ, 'NODE_OPTIONS': '--experimental-vm-modules'}
)

print("STDOUT:")
print(result.stdout)
print("\\nSTDERR:")
print(result.stderr)
print(f"\\nReturn code: {result.returncode}")

# Try to read test results
try:
    with open('/app/test-results.json', 'r') as f:
        results = json.load(f)
        print(f"\\nTest Summary:")
        print(f"  Total tests: {results.get('numTotalTests', 0)}")
        print(f"  Passed: {results.get('numPassedTests', 0)}")
        print(f"  Failed: {results.get('numFailedTests', 0)}")
        print(f"  Test suites: {results.get('numTotalTestSuites', 0)}")
except Exception as e:
    print(f"Could not read test results: {e}")
    `);
    
    console.log(testRun.logs);
    
    if (testRun.error) {
      log.error('Test execution failed:');
      console.error(testRun.error);
    }
    
    // Get test results summary
    log.info('Fetching test results...');
    const testSummary = await sandbox.runCode(`
import json
import os

# Read test results
if os.path.exists('/app/test-results.json'):
    with open('/app/test-results.json', 'r') as f:
        results = json.load(f)
        print("\\n" + "="*50)
        print("TEST RESULTS SUMMARY")
        print("="*50)
        print(f"Total tests: {results.get('numTotalTests', 0)}")
        print(f"Passed: {results.get('numPassedTests', 0)}")
        print(f"Failed: {results.get('numFailedTests', 0)}")
        print(f"Test suites: {results.get('numTotalTestSuites', 0)}")
        print(f"Success: {results.get('success', False)}")

# Read coverage report
if os.path.exists('/app/coverage/coverage-summary.json'):
    with open('/app/coverage/coverage-summary.json', 'r') as f:
        coverage = json.load(f)
        total = coverage.get('total', {})
        print("\\n" + "="*50)
        print("COVERAGE SUMMARY")
        print("="*50)
        print(f"Statements: {total.get('statements', {}).get('pct', 0)}%")
        print(f"Branches: {total.get('branches', {}).get('pct', 0)}%")
        print(f"Functions: {total.get('functions', {}).get('pct', 0)}%")
        print(f"Lines: {total.get('lines', {}).get('pct', 0)}%")
else:
    print("No coverage report found")
    `);
    console.log(testSummary.logs);
    
    // List files in sandbox
    log.info('Files in sandbox:');
    const files = await sandbox.files.list('/app');
    files.forEach(file => {
      console.log(`  - ${file.name}${file.type === 'directory' ? '/' : ''}`);
    });
    
    log.header('Test Run Complete');
    log.success('Tests executed successfully in E2B sandbox!');
    
  } catch (error) {
    log.error(`Sandbox execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up sandbox
    if (sandbox) {
      log.info('Closing sandbox...');
      try {
        await sandbox.kill();
        log.success('Sandbox closed');
      } catch (err) {
        // Sandbox might already be closed
        log.info('Sandbox cleanup completed');
      }
    }
  }
}

// Run the tests
runTestsInSandbox().catch(console.error);