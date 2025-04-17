import { getDirname, resolvePath, getProjectRoot } from './shared/path-utils';

// Test the path utilities
console.log('======= Testing Path Utilities =======');

// Test getDirname
console.log('1. Testing getDirname:');
const currentDirname = getDirname(import.meta.url);
console.log('   Current dirname:', currentDirname);

// Test resolvePath
console.log('\n2. Testing resolvePath:');
const clientSrcPath = resolvePath(import.meta.url, 'client', 'src');
console.log('   Client src path:', clientSrcPath);

// Test getProjectRoot
console.log('\n3. Testing getProjectRoot:');
const projectRoot = getProjectRoot(import.meta.url);
console.log('   Project root:', projectRoot);

// Test with vite.config.ts (simulate the problem file)
console.log('\n4. Testing vite-style path resolution:');
console.log('   This is simulating what vite.config.ts would do');

// Normal Replit approach (should work in Replit)
try {
  if (typeof (import.meta as any).dirname === 'string') {
    console.log('   Replit dirname available:', (import.meta as any).dirname);
    
    const viteConfigClientPath = resolvePath(import.meta.url, 'client', 'src');
    console.log('   Vite config client path using utils:', viteConfigClientPath);
  } else {
    console.log('   Replit dirname not available (expected in local environment)');
  }
} catch (e) {
  console.error('   Error testing Replit approach:', e);
}

console.log('\n======= Test Complete =======');