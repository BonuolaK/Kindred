#!/usr/bin/env node
/**
 * local-dev.js
 * 
 * This is a startup script for local development that ensures path compatibility
 * with both Replit and local environments. It loads our path-compat module first
 * to ensure directories are correctly resolved regardless of environment.
 * 
 * Usage:
 *   node local-dev.js
 * 
 * If you need to pass additional arguments to the server, you can do so like this:
 *   node local-dev.js --some-arg=value
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

// Set the correct environment variables for local development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Explicitly add the current directory to the module search path
module.paths.push(path.resolve('.'));

// Check if DATABASE_URL is set, if not, try to load from .env file
if (!process.env.DATABASE_URL) {
  try {
    if (fs.existsSync('.env')) {
      console.log('[local-dev] Loading environment variables from .env file');
      require('dotenv').config();
    } else {
      console.log('[local-dev] No .env file found');
    }
  } catch (e) {
    console.log('[local-dev] Could not load .env file. Consider installing dotenv: npm install dotenv');
  }
}

// Check environment
console.log('[local-dev] Starting local development server...');
console.log('[local-dev] Node version:', process.version);
console.log('[local-dev] DATABASE_URL:', process.env.DATABASE_URL ? 'Configured' : 'Not configured');

// Import our compatibility module before anything else
import('./path-compat.js')
  .then(() => {
    console.log("[local-dev] Path compatibility layer loaded");
    console.log("[local-dev] Running on operating system:", process.platform);
    
    // Set DB_CLIENT to 'pg' to use node-postgres instead of neon
    process.env.DB_CLIENT = 'pg';
    
    // Now we can safely load the server
    import('./server/index.js')
      .then(() => {
        console.log("[local-dev] Server started successfully");
      })
      .catch(err => {
        console.error("[local-dev] Error starting server:", err);
        process.exit(1);
      });
  })
  .catch(err => {
    console.error("[local-dev] Failed to load path compatibility module:", err);
    process.exit(1);
  });