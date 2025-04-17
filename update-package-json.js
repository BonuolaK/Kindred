/**
 * Script to add scripts to package.json without modifying the original file
 * Run with: node update-package-json.js
 */

const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(__dirname, 'package.json');

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found');
  process.exit(1);
}

// Read package.json
try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  
  // Add local development scripts if they don't exist
  packageJson.scripts = packageJson.scripts || {};
  
  // Scripts to add
  const newScripts = {
    "local:start": "node local-dev.js npx ts-node server/index.ts",
    "local:build": "node local-bridge.js npx vite build",
    "local:db:push": "npx drizzle-kit push:pg",
    "local:create-users": "npx tsx scripts/create-dummy-users.ts"
  };
  
  // Check which scripts already exist
  const scriptsToAdd = {};
  let hasChanges = false;
  
  for (const [key, value] of Object.entries(newScripts)) {
    if (!packageJson.scripts[key]) {
      scriptsToAdd[key] = value;
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    // Create a new object with all scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      ...scriptsToAdd
    };
    
    // Write back to package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log('Successfully added local development scripts to package.json:');
    console.log(scriptsToAdd);
  } else {
    console.log('No changes needed - all scripts already exist in package.json');
  }
} catch (error) {
  console.error('Error updating package.json:', error);
}