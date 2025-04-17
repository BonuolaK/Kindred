// dirname-polyfill.js
import path from 'path';
import { fileURLToPath } from 'url';

// This script patches import.meta.dirname if it doesn't exist
// For compatibility with different Node.js environments
if (import.meta && !('dirname' in import.meta)) {
  // Use URL and fileURLToPath to get the directory name
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Define the property if it doesn't exist
  Object.defineProperty(import.meta, 'dirname', {
    get: () => __dirname,
    configurable: true
  });
  
  console.log('Successfully polyfilled import.meta.dirname for local environment');
}