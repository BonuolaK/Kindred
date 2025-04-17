// path-compat.js
// Cross-environment compatibility solution for path resolution
// Works in both Replit (with import.meta.dirname) and local environments (where import.meta might be undefined)

import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';
import * as url from 'url';

// Safely get the current file's directory in ESM
// This approach should work across all Node.js versions and environments
function getCurrentDirname() {
  try {
    // For environments with import.meta.url (most modern Node.js)
    if (typeof import.meta === 'object' && import.meta !== null && typeof import.meta.url === 'string') {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch (e) {
    console.warn('[path-compat] Error accessing import.meta.url:', e.message);
  }

  // Fallback for older Node.js versions or environments without import.meta
  // Use a stable reference point - this file's location
  try {
    // This uses the __filename equivalent in ESM
    const fileName = url.fileURLToPath(import.meta.url || url.__filename);
    return path.dirname(fileName);
  } catch (e) {
    console.warn('[path-compat] Error with fileURLToPath fallback:', e.message);
  }

  // Last resort fallback - use the current working directory
  console.warn('[path-compat] Using process.cwd() as fallback - this may not be accurate!');
  return process.cwd();
}

// Get the current directory
const currentDirname = getCurrentDirname();

// Get the project root directory (one level up from this file)
const projectRoot = path.resolve(currentDirname);

// Export helper functions
export function getDirname() {
  return currentDirname;
}

export function getProjectRoot() {
  return projectRoot;
}

// Helper function to resolve paths relative to project root
export function resolveFromRoot(...segments) {
  return path.resolve(projectRoot, ...segments);
}

// Helper functions specifically for Vite config files
export const viteAliases = {
  "@": path.resolve(projectRoot, "client", "src"),
  "@shared": path.resolve(projectRoot, "shared"),
  "@assets": path.resolve(projectRoot, "attached_assets"),
};

export const viteRoot = path.resolve(projectRoot, "client");
export const viteOutDir = path.resolve(projectRoot, "dist/public");

console.log('[path-compat] Project root resolved as:', projectRoot);