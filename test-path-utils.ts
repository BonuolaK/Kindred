/**
 * Helper utilities for path resolution that work in both Replit and local environments
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory safely for both environments
export function getProjectRoot(): string {
  try {
    // Replit environment
    if (typeof process !== 'undefined' && process.env.REPL_ID) {
      // Use import.meta.dirname if available (Replit-specific)
      if (typeof (import.meta as any).dirname === 'string') {
        return (import.meta as any).dirname;
      }
    }
    
    // Local environment or fallback
    // This file should be in the project root
    const currentFileUrl = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileUrl);
    return path.dirname(currentFilePath);
  } catch (error) {
    // Last resort fallback - just use current working directory
    return process.cwd();
  }
}

// Resolve a path relative to project root
export function resolveProjectPath(...pathSegments: string[]): string {
  const root = getProjectRoot();
  return path.resolve(root, ...pathSegments);
}