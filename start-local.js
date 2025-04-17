// start-local.js
// This script polyfills import.meta.dirname for local environments before starting the application

import './dirname-polyfill.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Kindred in local development mode...');
console.log('Using dirname polyfill for compatibility...');

// Function to check if a command exists in PATH
function commandExists(command) {
  try {
    // Try to find the command using 'which' (Unix) or 'where' (Windows)
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    const result = require('child_process').execSync(`${checkCmd} ${command}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Function to run the server
function startServer() {
  // Use npx to run tsx if it's not installed globally
  const executable = commandExists('tsx') ? 'tsx' : 'npx';
  const args = commandExists('tsx') ? ['server/index.ts'] : ['tsx', 'server/index.ts'];
  
  console.log(`Using ${executable} to start the server...`);
  
  // Spawn the development server with the appropriate command
  const serverProcess = spawn(executable, args, {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_OPTIONS: `--experimental-loader ${path.join(__dirname, 'dir-loader.js')}`
    },
    shell: true // This helps with path resolution on different platforms
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    
    // If npx also fails, try fallback to node directly
    if (executable === 'npx') {
      console.log('Trying alternative approach with node...');
      const nodeProcess = spawn('node', ['--loader', path.join(__dirname, 'dir-loader.js'), 'server/index.js'], {
        stdio: 'inherit',
        cwd: __dirname,
        shell: true
      });
      
      nodeProcess.on('error', (nodeError) => {
        console.error('Failed to start with node:', nodeError);
        console.log('\nPlease install tsx globally with: npm install -g tsx');
        console.log('Or run the project with: npm run dev');
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
}

// Check if tsx is installed
if (!fs.existsSync(path.join(__dirname, 'node_modules', '.bin', 'tsx')) && !commandExists('tsx')) {
  console.log('tsx not found. Installing required dependencies...');
  
  // Run npm install to ensure dependencies are installed
  const installProcess = spawn('npm', ['install'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
  });
  
  installProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('Dependencies installed successfully.');
      startServer();
    } else {
      console.error('Failed to install dependencies. Please run npm install manually.');
      process.exit(1);
    }
  });
} else {
  startServer();
}