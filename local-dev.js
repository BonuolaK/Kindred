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