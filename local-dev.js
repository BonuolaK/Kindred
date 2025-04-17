/**
 * Local Development Script
 * This script runs a command with the environment variables and configuration needed for local development
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for development
process.env.NODE_ENV = 'development';
process.env.LOCAL_DEVELOPMENT = 'true';

// Get arguments after the script name
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('No command specified. Usage: node local-dev.js <command>');
  process.exit(1);
}

// Run the local bridge script with the specified command
const bridgePath = path.join(__dirname, 'local-bridge.js');
const allArgs = ['node', bridgePath, ...args];

console.log(`Running command with local bridge: ${args.join(' ')}`);
const child = spawn(allArgs[0], allArgs.slice(1), {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    LOCAL_DEVELOPMENT: 'true',
    PORT: process.env.PORT || '5000'
  }
});

child.on('close', (code) => {
  console.log(`Command exited with code ${code}`);
  process.exit(code);
});