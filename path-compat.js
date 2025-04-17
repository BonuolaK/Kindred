// path-compat.js
// This is a cross-environment compatibility solution for import.meta.dirname
// Works in both Replit and local environments by patching the import.meta object

import { fileURLToPath } from 'url';
import path from 'path';

// Patch the import.meta object globally if dirname is not available
// This is executed when this module is imported
(function patchImportMeta() {
  try {
    // Check if import.meta.dirname is available
    if (import.meta.dirname === undefined) {
      // Create a getter for import.meta.dirname that calculates the directory from import.meta.url
      Object.defineProperty(import.meta, 'dirname', {
        get: function() {
          // Get the directory from the URL
          const filename = fileURLToPath(import.meta.url);
          return path.dirname(filename);
        },
        configurable: true
      });
      console.log('[path-compat] Patched import.meta.dirname for local environment compatibility');
    }
  } catch (e) {
    console.warn('[path-compat] Unable to patch import.meta.dirname:', e.message);
  }
})();

// Export helper functions for convenience
export function getDirname() {
  try {
    return import.meta.dirname;
  } catch (e) {
    const filename = fileURLToPath(import.meta.url);
    return path.dirname(filename);
  }
}

// Get the project root directory
export function getProjectRoot() {
  return getDirname();
}

// Helper functions for resolving paths relative to project root
export function resolveFromRoot(...segments) {
  return path.resolve(getProjectRoot(), ...segments);
}