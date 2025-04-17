import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the directory name of the current module, compatible with both Replit and local environments
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns The directory path of the current module
 */
export function getDirname(importMetaUrl: string): string {
  try {
    // First try Replit's approach
    if (typeof (import.meta as any).dirname === 'string') {
      return (import.meta as any).dirname;
    }
  } catch (e) {
    // Ignore error, will use standard approach
  }
  
  // Standard Node.js approach for ES modules
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

/**
 * Resolve a path relative to the current module, compatible with both Replit and local environments
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @param ...paths - Paths to resolve relative to the current module directory
 * @returns Resolved absolute path
 */
export function resolvePath(importMetaUrl: string, ...paths: string[]): string {
  const dirname = getDirname(importMetaUrl);
  return path.resolve(dirname, ...paths);
}

/**
 * Get the project root directory
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns The project root directory path
 */
export function getProjectRoot(importMetaUrl: string): string {
  // Navigate up from the current file to find project root
  // This assumes that shared/path-utils.ts is directly in the shared directory
  // which is directly in the project root
  return path.resolve(getDirname(importMetaUrl), '..');
}