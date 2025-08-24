# E2B Sandbox Testing Setup Guide

## Prerequisites

1. **Get E2B API Key**
   - Sign up at https://e2b.dev
   - Go to Dashboard: https://e2b.dev/dashboard
   - Copy your API key

2. **Configure API Key**
   - Edit `.env` file
   - Replace `e2b_YOUR_API_KEY_HERE` with your actual API key:
   ```
   E2B_API_KEY=e2b_your_actual_key_here
   ```

## Installation

```bash
# Install E2B SDK (already done)
npm install @e2b/code-interpreter dotenv

# Install all dependencies
npm install
```

## Running Tests

### Option 1: Local E2B Test Runner
Runs tests locally with E2B environment simulation:
```bash
npm run test:e2b
```

### Option 2: E2B Sandbox Tests
Runs tests in an actual E2B cloud sandbox:
```bash
npm run test:sandbox
```

## Available Test Commands

- `npm test` - Run tests locally with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:verbose` - Run tests with verbose output
- `npm run test:e2b` - Run tests with E2B environment detection
- `npm run test:sandbox` - Run tests in E2B cloud sandbox

## How E2B Sandbox Works

1. **Creates Cloud Sandbox**: Spins up an isolated container in E2B cloud
2. **Uploads Project Files**: Transfers your code to the sandbox
3. **Installs Dependencies**: Runs npm install in the sandbox
4. **Executes Tests**: Runs Jest test suite in isolated environment
5. **Returns Results**: Streams test output and coverage reports
6. **Cleans Up**: Automatically closes sandbox after tests complete

## Benefits of E2B Testing

- **Complete Isolation**: Tests run in clean environment
- **No Local Dependencies**: Don't need Node.js locally
- **Reproducible**: Same environment every time
- **Parallel Testing**: Run multiple sandboxes simultaneously
- **CI/CD Ready**: Easy integration with GitHub Actions

## Troubleshooting

### If sandbox creation fails:
1. Check your E2B_API_KEY is valid
2. Ensure you have internet connection
3. Check E2B service status: https://status.e2b.dev

### If tests fail in sandbox but pass locally:
1. Check for hardcoded paths
2. Verify all files are uploaded
3. Check environment variable differences

## Next Steps

1. **Set up CI/CD**: Add E2B tests to your GitHub Actions workflow
2. **Create Templates**: Build custom E2B templates for different test scenarios
3. **Monitor Results**: Use E2B dashboard to track test runs

## Example Output

When you run `npm run test:sandbox`, you'll see:
```
═══ E2B Sandbox Test Runner ═══

ℹ Creating E2B sandbox...
✓ Sandbox created with ID: sbx_abc123
ℹ Uploading project files to sandbox...
ℹ Installing dependencies in sandbox...
✓ Dependencies installed successfully

═══ Running Tests in Sandbox ═══

Test Summary:
  Total tests: 66
  Passed: 46
  Failed: 20
  Test suites: 3

Coverage Summary:
  Statements: 42.27%
  Branches: 45.81%
  Functions: 47.05%
  Lines: 41.77%

═══ Test Run Complete ═══

✓ Tests executed successfully in E2B sandbox!
ℹ Closing sandbox...
✓ Sandbox closed
```

## Security Note

Never commit your E2B_API_KEY to version control. Always use environment variables or `.env` files (which should be in `.gitignore`).