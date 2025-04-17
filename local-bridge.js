/**
 * Local Bridge Script
 * This script temporarily replaces vite.config.ts with a version that works in local environments
 * It handles cleanup to restore the original file when the process exits
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Paths
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
const backupPath = path.join(__dirname, 'vite.config.orig.ts');
const wrapperPath = path.join(__dirname, 'vite.config.wrapper.ts');

// Flag to track whether we need to restore the original config
let needRestore = false;

function backupOriginalConfig() {
  if (fs.existsSync(viteConfigPath) && !fs.existsSync(backupPath)) {
    console.log('Backing up original vite.config.ts...');
    fs.copyFileSync(viteConfigPath, backupPath);
    needRestore = true;
  }
}

function replaceWithWrapper() {
  console.log('Replacing vite.config.ts with wrapper...');
  if (fs.existsSync(wrapperPath)) {
    const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');
    fs.writeFileSync(viteConfigPath, wrapperContent);
  } else {
    console.error('Error: vite.config.wrapper.ts not found!');
    process.exit(1);
  }
}

function restoreOriginalConfig() {
  if (needRestore && fs.existsSync(backupPath)) {
    console.log('Restoring original vite.config.ts...');
    fs.copyFileSync(backupPath, viteConfigPath);
    fs.unlinkSync(backupPath);
    needRestore = false;
  }
}

function cleanup() {
  console.log('Cleaning up...');
  restoreOriginalConfig();
}

function main() {
  // Set environment variable for local development
  process.env.LOCAL_DEVELOPMENT = 'true';
  
  // Backup original config and replace with wrapper
  backupOriginalConfig();
  replaceWithWrapper();
  
  // Register cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit();
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit();
  });
  
  // Get arguments after the script name
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('No command specified. Usage: node local-bridge.js <command>');
    cleanup();
    process.exit(1);
  }
  
  // Run the specified command
  console.log(`Running command: ${args.join(' ')}`);
  const child = spawn(args[0], args.slice(1), {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      LOCAL_DEVELOPMENT: 'true'
    }
  });
  
  child.on('close', (code) => {
    console.log(`Command exited with code ${code}`);
    cleanup();
    process.exit(code);
  });
}

// Run the main function
main();