/**
 * Local Development Entry Point for Kindred
 * This script uses local-bridge.js to configure the environment for local development
 * and then starts the application with the appropriate settings.
 */

// Load environment variables from .env file if present
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not installed, skipping .env file loading');
}

// Set up essential environment variables if not already set
process.env.LOCAL_DEVELOPMENT = 'true';
process.env.NODE_ENV = 'development';

// Default environment variables if not set in .env
if (!process.env.PORT) process.env.PORT = '5000';
if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = 'local-dev-secret-key';

// Check for database environment variables
if (!process.env.DATABASE_URL) {
  console.warn('\x1b[33mWARNING: DATABASE_URL not set! Using default local PostgreSQL settings.\x1b[0m');
  console.warn('\x1b[33mIf this is not correct, please create a .env file with your database config.\x1b[0m');
  
  // Set default PostgreSQL connection details
  process.env.PGUSER = process.env.PGUSER || 'postgres';
  process.env.PGPASSWORD = process.env.PGPASSWORD || 'postgres';
  process.env.PGDATABASE = process.env.PGDATABASE || 'kindred';
  process.env.PGHOST = process.env.PGHOST || 'localhost';
  process.env.PGPORT = process.env.PGPORT || '5432';
  
  // Construct DATABASE_URL from components
  process.env.DATABASE_URL = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
}

console.log(`
======================================================
🚀 Starting Kindred Dating App in Local Development Mode
======================================================

📊 Environment:
   - PORT: ${process.env.PORT}
   - NODE_ENV: ${process.env.NODE_ENV}
   - Database: ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}

📋 Steps to run locally:
   1. Make sure PostgreSQL is running and accessible
   2. Database should be created and migrated
   3. If needed, run \`npx tsx scripts/create-dummy-users.ts\` to create test users

📱 The app will be available at: http://localhost:${process.env.PORT}
`);

// Using local-bridge to start the server
// The bridge will handle vite.config.ts swapping for local compatibility
const { execSync } = require('child_process');

// Check if ts-node is installed
try {
  execSync('npx ts-node --version', { stdio: 'ignore' });
} catch (e) {
  console.error('\x1b[31mERROR: ts-node is required but not installed.\x1b[0m');
  console.log('Installing ts-node...');
  execSync('npm install --save-dev ts-node', { stdio: 'inherit' });
}

// Check if dotenv is installed
try {
  execSync('npx dotenv --version', { stdio: 'ignore' });
} catch (e) {
  console.log('Installing dotenv...');
  execSync('npm install --save-dev dotenv', { stdio: 'inherit' });
}

// Start the server through the bridge
require('./local-bridge.js');