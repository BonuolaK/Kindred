#!/usr/bin/env node

/**
 * Local Development Runner
 * This script runs the application in a way that works in both Replit and local environments
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Path to the vite.config.ts file
const viteConfigPath = path.join(__dirname, 'vite.config.ts');

// Check if vite.config.ts exists
if (!fs.existsSync(viteConfigPath)) {
  console.error('Error: vite.config.ts not found');
  process.exit(1);
}

// Define a function to patch the import.meta.dirname property
function patchImportMeta() {
  // This will be executed in the Node.js process
  // Create a temporary vite.config.loader.js file that patches import.meta
  const loaderPath = path.join(__dirname, 'vite.config.loader.js');
  
  const loaderContent = `
// This is a temporary loader file that patches import.meta.dirname
const path = require('path');

// Define import.meta.dirname if it doesn't exist
if (typeof globalThis.import === 'undefined') {
  globalThis.import = { meta: {} };
}

if (typeof globalThis.import.meta === 'undefined') {
  globalThis.import.meta = {};
}

if (typeof globalThis.import.meta.dirname === 'undefined') {
  Object.defineProperty(globalThis.import.meta, 'dirname', {
    value: process.cwd()
  });
}

// Load the original vite.config.ts file
// Since we patched import.meta.dirname, it should work fine
module.exports = require('./vite.config.ts');
`;

  // Write the loader file
  fs.writeFileSync(loaderPath, loaderContent);
  
  // Make sure to clean up the loader file when the process exits
  process.on('exit', () => {
    try {
      if (fs.existsSync(loaderPath)) {
        fs.unlinkSync(loaderPath);
      }
    } catch (error) {
      console.error('Error cleaning up loader file:', error);
    }
  });
  
  return loaderPath;
}

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.LOCAL_DEVELOPMENT = 'true';

// Create the loader file
const loaderPath = patchImportMeta();

// Start the server
console.log('Starting server with patched import.meta.dirname...');
const server = spawn('node', ['server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_CONFIG_PATH: loaderPath
  }
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle interrupts
process.on('SIGINT', () => {
  server.kill('SIGINT');
});