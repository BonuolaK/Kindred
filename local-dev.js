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
 * Debug Mode:
 *   node local-dev.js --debug    # Sets LOG_LEVEL to debug
 * 
 * Verbose Output:
 *   node local-dev.js --verbose  # Enables more detailed console output
 */

// Parse command line arguments
const args = process.argv.slice(2);
const DEBUG_MODE = args.includes('--debug');
const VERBOSE_MODE = args.includes('--verbose');

// Set the correct environment variables for local development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Set default logging level based on arguments
if (DEBUG_MODE) {
  process.env.LOG_LEVEL = 'debug';
}

// Enable stack traces for async functions
Error.stackTraceLimit = VERBOSE_MODE ? Infinity : 10;

// Add timestamps to console logs in local development
if (VERBOSE_MODE) {
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleDebug = console.debug;
  
  const addTimestamp = (type, args) => {
    const timestamp = new Date().toISOString();
    return [`[${timestamp}] [${type}]`, ...args];
  };
  
  // Override console methods to add timestamps
  console.log = (...args) => originalConsoleLog(...addTimestamp('LOG', args));
  console.info = (...args) => originalConsoleInfo(...addTimestamp('INFO', args));
  console.warn = (...args) => originalConsoleWarn(...addTimestamp('WARN', args));
  console.error = (...args) => originalConsoleError(...addTimestamp('ERROR', args));
  console.debug = (...args) => originalConsoleDebug(...addTimestamp('DEBUG', args));
}

// Catch unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('[local-dev] Unhandled Promise Rejection:', reason);
  if (VERBOSE_MODE) {
    console.error('Promise:', promise);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[local-dev] Uncaught Exception:', err);
  process.exit(1);
});

console.log("[local-dev] Starting Kindred in local development mode");
console.log(`[local-dev] Debug mode: ${DEBUG_MODE}, Verbose mode: ${VERBOSE_MODE}`);

// Import our compatibility module before anything else
import('./path-compat.js')
  .then(() => {
    console.log("[local-dev] Path compatibility layer loaded");
    
    // Now we can safely load the server
    console.log("[local-dev] Loading server...");
    
    import('./server/index.ts')
      .catch(err => {
        console.error("[local-dev] Error starting server:", err);
        process.exit(1);
      });
  })
  .catch(err => {
    console.error("[local-dev] Failed to load path compatibility module:", err);
    console.error(err);
    process.exit(1);
  });