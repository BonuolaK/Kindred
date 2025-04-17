import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get project root directory in a way that works in both Replit and local environments
 */
export function getProjectRoot(): string {
  try {
    // In Replit environment, import.meta.dirname is available
    if (typeof (import.meta as any).dirname === 'string') {
      return (import.meta as any).dirname;
    }
  } catch (e) {
    // Ignore errors - we'll use the alternative method
  }
  
  // In local environment, use fileURLToPath
  // This is executed from shared/path-utils.ts, so we need to go up one level
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '..');
}

/**
 * Resolve a path from the project root directory
 * Works in both Replit and local environments
 */
export function resolvePath(...pathSegments: string[]): string {
  const root = getProjectRoot();
  return path.resolve(root, ...pathSegments);
}