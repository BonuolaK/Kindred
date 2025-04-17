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

/**
 * Load environment variables from a .env file if running locally
 * @param envPath Optional path to .env file, defaults to project root
 */
export function loadEnv(envPath?: string): void {
  // If we're in Replit, don't try to load from .env file
  if (process.env.REPL_ID) {
    console.log('[env-loader] Running in Replit, using environment variables from Replit Secrets');
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
      console.warn(`[env-loader] No .env file found at ${envFile}`);
      return;
    }

    // Read and parse .env file
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envLines = envContent.split('\n');

    // Process each line in the .env file
    let loadedVars = 0;
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
        }
      }
    }
    
    console.log(`[env-loader] Loaded ${loadedVars} environment variables from .env file`);
  } catch (error) {
    console.error('[env-loader] Error loading .env file:', error);
  }
}