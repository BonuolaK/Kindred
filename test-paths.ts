import path from 'path';
import { fileURLToPath } from 'url';

function getPathInfo() {
  console.log('Testing path resolution in Replit:');
  
  try {
    console.log('import.meta.url:', import.meta.url);
    
    // Test Replit path
    console.log('import.meta.dirname available:', typeof (import.meta as any).dirname === 'string');
    if (typeof (import.meta as any).dirname === 'string') {
      console.log('import.meta.dirname:', (import.meta as any).dirname);
    }
    
    // Test Node.js path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    console.log('__filename:', __filename);
    console.log('__dirname:', __dirname);
    
    // Test our resolution strategy
    const resolvedPath = typeof (import.meta as any).dirname === 'string' 
      ? path.resolve((import.meta as any).dirname, 'client', 'src')
      : path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'client', 'src');
    
    console.log('Resolved path:', resolvedPath);
    
    return {
      success: true,
      replitMethod: typeof (import.meta as any).dirname === 'string',
      path: resolvedPath
    };
  } catch (error) {
    console.error('Error during path resolution:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

getPathInfo();