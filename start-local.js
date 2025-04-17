// start-local.js
// This script polyfills import.meta.dirname for local environments before starting the application

import './dirname-polyfill.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Kindred in local development mode...');
console.log('Using dirname polyfill for compatibility...');

// Spawn the development server
const serverProcess = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_OPTIONS: `--experimental-loader ${path.join(__dirname, 'dir-loader.js')}`
  }
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});