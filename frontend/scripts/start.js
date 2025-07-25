// scripts/start.js - ไฟล์นี้จะ override react-scripts start
process.env.GENERATE_SOURCEMAP = 'false';

// Set environment for development
process.env.NODE_ENV = 'development';

// Import และ run react-scripts start
const { spawn } = require('child_process');
const path = require('path');

// Find react-scripts
const reactScriptsPath = path.join(__dirname, '../node_modules/.bin/react-scripts');

// Run react-scripts start with custom configuration
const child = spawn('node', [
  require.resolve('react-scripts/scripts/start.js')
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    GENERATE_SOURCEMAP: 'false',
    FAST_REFRESH: 'true',
    SKIP_PREFLIGHT_CHECK: 'true'
  }
});

child.on('close', (code) => {
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});