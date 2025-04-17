#!/usr/bin/env node
/**
 * local-start.js - Entry point for local development
 * 
 * This is a startup script that uses tsx to run the TypeScript code
 * in the local environment. It acts as a bridge between Node.js and
 * the TypeScript application.
 * 
 * Usage:
 *   node local-start.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const DEBUG_MODE = args.includes('--debug');
const VERBOSE_MODE = args.includes('--verbose');

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (DEBUG_MODE) {
  process.env.LOG_LEVEL = 'debug';
}

console.log("🚀 Starting Kindred in local development mode");
console.log(`Debug mode: ${DEBUG_MODE ? 'enabled' : 'disabled'}, Verbose mode: ${VERBOSE_MODE ? 'enabled' : 'disabled'}`);

// Check if tsx is installed
try {
  const tsxVersion = execSync('npx tsx --version', { stdio: 'pipe' }).toString().trim();
  console.log(`Found tsx version: ${tsxVersion}`);
} catch (error) {
  console.error("❌ tsx is not installed. Please install it with: npm install -g tsx");
  console.error("Or run: npm install tsx --save-dev");
  process.exit(1);
}

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.warn("⚠️ No .env file found. Creating one from .env.example...");
  try {
    const examplePath = path.join(__dirname, '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log("✅ Created .env file from .env.example");
      console.log("   Please edit .env file and add your database credentials and other settings.");
    } else {
      console.warn("🔶 .env.example not found. Please create a .env file manually.");
    }
  } catch (err) {
    console.error("❌ Failed to create .env file:", err.message);
  }
}

// Launch the server using tsx
const tsxArgs = ['server/index.ts'];
if (DEBUG_MODE) {
  tsxArgs.unshift('--inspect');
}

console.log(`🚀 Launching server with: npx tsx ${tsxArgs.join(' ')}`);

const server = spawn('npx', ['tsx', ...tsxArgs], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error(`❌ Failed to start server: ${err.message}`);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server process exited with code ${code}`);
  }
  process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log("\n👋 Shutting down gracefully...");
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log("\n👋 Shutting down gracefully...");
  server.kill('SIGTERM');
});