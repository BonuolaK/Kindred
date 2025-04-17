/**
 * This file tests path resolution in both Replit and local environments
 * It's used for debugging path resolution issues
 */

import { getProjectRoot, resolveProjectPath } from './test-path-utils';
import path from 'path';

function getPathInfo() {
  console.log('=== Path Information ===');
  
  try {
    // Test project root detection
    const projectRoot = getProjectRoot();
    console.log('Project Root:', projectRoot);
    
    // Test path resolution
    console.log('client/src path:', resolveProjectPath('client', 'src'));
    console.log('shared path:', resolveProjectPath('shared'));
    console.log('attached_assets path:', resolveProjectPath('attached_assets'));
    
    // Environment information
    console.log('process.cwd():', process.cwd());
    console.log('Environment:', {
      REPL_ID: process.env.REPL_ID || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    });
    
    // Get __dirname equivalent in ESM
    try {
      const dirname = path.dirname(new URL(import.meta.url).pathname);
      console.log('__dirname equivalent:', dirname);
    } catch (error) {
      console.log('Error getting __dirname equivalent:', error);
    }
  } catch (error) {
    console.error('Error getting path information:', error);
  }
}

// Run the function
getPathInfo();