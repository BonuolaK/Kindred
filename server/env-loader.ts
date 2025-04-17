/**
 * Environment Variable Loader
 * 
 * This module loads environment variables from a .env file in local development
 * environments but doesn't interfere with Replit's environment variable system.
 * 
 * Usage:
 *   import { loadEnv } from './env-loader.ts';
 *   loadEnv();
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './debug-logger';

/**
 * Load environment variables from a .env file if running locally
 * @param envPath Optional path to .env file, defaults to project root
 */
export function loadEnv(envPath?: string): void {
  // Set up logging based on environment
  const isReplit = !!process.env.REPL_ID;
  
  // Automatically enable debug logging in local environments
  if (!isReplit && !process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = 'debug';
  }
  
  // If we're in Replit, don't try to load from .env file
  if (isReplit) {
    logger.info('Running in Replit, using environment variables from Replit Secrets');
    
    // Log key environment variables (without sensitive values)
    logger.debug('Environment configuration check:');
    const keysToCheck = [
      'NODE_ENV', 'PORT', 'REPL_ID', 'REPL_OWNER', 'DATABASE_URL',
      // Add other keys you want to verify are present (but not show values)
    ];
    
    keysToCheck.forEach(key => {
      logger.debug(` - ${key}: ${process.env[key] ? '[Set]' : '[Not set]'}`);
    });
    
    return;
  }

  try {
    // Determine the path to the .env file
    const rootDir = envPath || 
      (typeof import.meta === 'object' && import.meta !== null && typeof import.meta.url === 'string' 
        ? path.dirname(path.dirname(fileURLToPath(import.meta.url))) // server/env-loader.ts -> project root
        : process.cwd());
    
    const envFile = path.join(rootDir, '.env');
    
    // Check if .env file exists
    if (!fs.existsSync(envFile)) {
      logger.warn(`No .env file found at ${envFile}`);
      logger.info(`Create a .env file by copying .env.example and filling in your values`);
      return;
    }

    // Read and parse .env file
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envLines = envContent.split('\n');

    // Process each line in the .env file
    let loadedVars = 0;
    const loadedKeys: string[] = [];
    
    for (const line of envLines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse key-value pairs
      const equalsIndex = trimmedLine.indexOf('=');
      if (equalsIndex > 0) {
        const key = trimmedLine.substring(0, equalsIndex).trim();
        let value = trimmedLine.substring(equalsIndex + 1).trim();
        
        // Handle quoted values
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        // Only set if not already defined
        if (!process.env[key]) {
          process.env[key] = value;
          loadedVars++;
          loadedKeys.push(key);
        }
      }
    }
    
    logger.info(`Loaded ${loadedVars} environment variables from .env file`);
    logger.debug(`Loaded keys: ${loadedKeys.join(', ')}`);
    
    // Check for required variables in local development
    const requiredVars = ['DATABASE_URL', 'SESSION_SECRET'];
    const missingVars = requiredVars.filter(key => !process.env[key]);
    
    if (missingVars.length > 0) {
      logger.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
      logger.info(`Make sure these are set in your .env file`);
    }
  } catch (error) {
    logger.error('Error loading .env file:', error);
  }
}