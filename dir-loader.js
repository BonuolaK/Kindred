// dir-loader.js
// This is a custom Node.js ESM loader that adds the import.meta.dirname property 
// to module import.meta objects if it doesn't exist

import { fileURLToPath } from 'url';
import path from 'path';

export function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  return nextLoad(url, context).then(result => {
    // Only process JavaScript modules
    if (result.format === 'module' || result.format === 'json') {
      const originalSource = result.source;
      
      // Add the following code at the beginning of the module
      const patchedSource = `
        // Patched by dir-loader.js
        import { fileURLToPath as __fileURLToPath } from 'url';
        import { dirname as __dirname } from 'path';
        
        // Define import.meta.dirname if it doesn't exist
        if (import.meta && !('dirname' in import.meta)) {
          Object.defineProperty(import.meta, 'dirname', {
            get: () => __dirname(__fileURLToPath(import.meta.url)),
            configurable: true
          });
        }
        
        ${originalSource}
      `;
      
      return {
        ...result,
        source: patchedSource
      };
    }
    
    return result;
  });
}