/**
 * Test Logging Script
 * 
 * This script demonstrates how to use the logger in both Replit and local environments.
 * 
 * Run this script with:
 *   tsx scripts/test-logging.ts
 * 
 * Or with debug logging:
 *   LOG_LEVEL=debug tsx scripts/test-logging.ts
 */

// Import the path-compat module first to ensure import.meta.dirname is available
import "../path-compat.js";

// Import our custom logger
import { logger } from "../server/debug-logger";

// Import the environment loader
import { loadEnv } from "../server/env-loader";

// Load environment variables
loadEnv();

// Basic console test
console.log('Standard console.log message');
console.debug('Standard console.debug message');
console.info('Standard console.info message');
console.warn('Standard console.warn message');
console.error('Standard console.error message');

// Logger tests
logger.debug('This is a debug message (only visible with LOG_LEVEL=debug)');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');

// Test with objects
const testObject = {
  name: 'Test User',
  age: 30,
  preferences: {
    theme: 'dark',
    notifications: true
  }
};

logger.debug('Debug object:', testObject);
logger.info('Info object:', testObject);

// Test with Error objects
try {
  throw new Error('Test error message');
} catch (error) {
  logger.error('Caught an error:', error);
}

// Test log level changing
logger.info('Current log level is set to the default');
logger.setLogLevel('debug');
logger.debug('Now debug messages should be visible regardless of LOG_LEVEL env var');

// Test enabling/disabling
logger.info('Logging is currently enabled');
logger.disable();
logger.info('This message should NOT appear');
logger.enable();
logger.info('Logging is enabled again, this message should appear');

console.log('Test script completed.');