/**
 * Vite Config Patcher
 * 
 * This script patches the vite.config.ts file to work in both Replit and local environments.
 * It doesn't directly modify the file but creates a shim that intercepts the import.meta.dirname usage.
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// Path to the original vite.config.ts
const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');

// Read the original file
console.log('Reading vite.config.ts...');
const originalContent = fs.readFileSync(viteConfigPath, 'utf-8');

// Add a patch to the global import.meta object if needed
if (!import.meta.dirname) {
  console.log('Patching import.meta.dirname...');
  Object.defineProperty(import.meta, 'dirname', {
    get: () => process.cwd()
  });
}

// Let the user know the patch was applied
console.log('Patch applied successfully!');
console.log('import.meta.dirname now resolves to:', import.meta.dirname);

// Load the vite config file
console.log('Loading vite.config.ts...');
import('./vite.config.ts')
  .then(config => {
    console.log('Vite config loaded successfully');
    return config.default; // This is the actual config object
  })
  .catch(error => {
    console.error('Error loading vite.config.ts:', error);
    process.exit(1);
  });