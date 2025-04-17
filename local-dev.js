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

// Set the correct environment variables for local development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Simple .env file loader for local development
function loadEnvFile() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      console.log("[local-dev] Loading environment variables from .env file");
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          // Remove quotes if present
          if (value.length > 0 && (value[0] === '"' && value[value.length - 1] === '"')) {
            value = value.substring(1, value.length - 1);
          }
          
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    } else {
      console.warn("[local-dev] No .env file found at", envPath);
    }
  } catch (err) {
    console.error("[local-dev] Failed to load .env file:", err.message);
  }
}

// Load environment variables from .env file
loadEnvFile();

// Import our compatibility module before anything else
import('./path-compat.js')
  .then(() => {
    console.log("[local-dev] Path compatibility layer loaded");
    
    // Now we can safely load the server
    import('./server/index.js')
      .catch(err => {
        console.error("[local-dev] Error starting server:", err);
        process.exit(1);
      });
  })
  .catch(err => {
    console.error("[local-dev] Failed to load path compatibility module:", err);
    process.exit(1);
  });