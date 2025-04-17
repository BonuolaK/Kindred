/**
 * Local Bridge Script
 * This script temporarily replaces vite.config.ts with a version that works in local environments
 * It handles cleanup to restore the original file when the process exits
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const VITE_CONFIG_PATH = path.join(__dirname, 'vite.config.ts');
const VITE_CONFIG_WRAPPER_PATH = path.join(__dirname, 'vite.config.wrapper.ts');
const VITE_CONFIG_BACKUP_PATH = path.join(__dirname, 'vite.config.ts.original');

// Check if required files exist
if (!fs.existsSync(VITE_CONFIG_WRAPPER_PATH)) {
  console.error('Error: vite.config.wrapper.ts not found. Please create this file first.');
  process.exit(1);
}

// Backup original vite.config.ts if it exists
function backupOriginalConfig() {
  if (fs.existsSync(VITE_CONFIG_PATH)) {
    console.log('Creating backup of original vite.config.ts...');
    fs.copyFileSync(VITE_CONFIG_PATH, VITE_CONFIG_BACKUP_PATH);
  } else {
    console.error('Warning: vite.config.ts not found. Will create it from wrapper.');
  }
}

// Replace vite.config.ts with our wrapper
function replaceWithWrapper() {
  console.log('Replacing vite.config.ts with local-compatible wrapper...');
  fs.copyFileSync(VITE_CONFIG_WRAPPER_PATH, VITE_CONFIG_PATH);
}

// Restore original vite.config.ts
function restoreOriginalConfig() {
  if (fs.existsSync(VITE_CONFIG_BACKUP_PATH)) {
    console.log('Restoring original vite.config.ts...');
    fs.copyFileSync(VITE_CONFIG_BACKUP_PATH, VITE_CONFIG_PATH);
    fs.unlinkSync(VITE_CONFIG_BACKUP_PATH);
  }
}

// Cleanup function
function cleanup() {
  console.log('Cleaning up...');
  try {
    restoreOriginalConfig();
    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Setup cleanup handlers
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit();
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  cleanup();
  process.exit(1);
});

// Main function
function main() {
  try {
    // Get the command to run
    const command = process.argv.slice(2).join(' ');
    if (!command) {
      console.error('Error: No command specified.');
      console.log('Usage: node local-bridge.js <command>');
      process.exit(1);
    }

    console.log(`Starting local bridge with command: ${command}`);
    
    // Backup and replace config
    backupOriginalConfig();
    replaceWithWrapper();
    
    // Set environment variables for local development
    const env = {
      ...process.env,
      LOCAL_DEVELOPMENT: 'true',
      NODE_ENV: 'development'
    };
    
    // Parse command into executable and args
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    // Execute the command
    console.log(`Executing: ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32' // Use shell on Windows
    });
    
    // Handle process exit
    proc.on('exit', (code) => {
      console.log(`Command exited with code ${code}`);
      // Cleanup will happen via the exit handler
    });
    
  } catch (error) {
    console.error('Error:', error);
    cleanup();
    process.exit(1);
  }
}

// Run the main function
main();