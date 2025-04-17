# Local Development Guide

This guide explains how to run the Kindred app in a local development environment.

## Quick Start

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and settings
   ```
4. **Set up a local PostgreSQL database**
5. **Start the app:**
   ```bash
   node local-start.js
   ```

## Prerequisites

- Node.js (version 18+)
- npm (version 8+)
- PostgreSQL (version 13+)

## Detailed Setup

### 1. Database Setup

You need a PostgreSQL database. You can:
- Install PostgreSQL locally
- Use Docker: `docker run --name kindred-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`
- Use a cloud database (e.g., Render, Neon, Supabase)

Update your `.env` file with the database connection details:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kindred
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=kindred
PGHOST=localhost
PGPORT=5432
```

### 2. Environment Variables

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Edit the `.env` file with:
- Your database credentials
- Authentication secrets (generate with `openssl rand -hex 32`)
- Google OAuth credentials (if using Google auth)
- Other required settings

## Running Locally

### Option 1: Use the local-dev.js script (Recommended)

This is the recommended approach as it ensures proper path resolution and provides debugging support:

```bash
# Basic usage
node local-dev.js

# Enable debug logging
node local-dev.js --debug

# Enable detailed verbose logging with timestamps
node local-dev.js --verbose

# Combine options
node local-dev.js --debug --verbose
```

The `--debug` flag sets the LOG_LEVEL environment variable to 'debug', which enables more detailed logging in the application.

The `--verbose` flag adds timestamps to console logs, increases stack trace limits, and provides more detailed error reporting when things go wrong.

### Option 2: Import the path-compat module first

If you need to run specific scripts, ensure you import the path-compat module first:

```javascript
// Your script.js
import './path-compat.js';
// Then the rest of your imports
import express from 'express';
// ...
```

### Option 3: Use local-vite-config.js for Vite

For Vite-specific operations, use the local-vite-config.js:

```bash
vite --config local-vite-config.js dev
# or
vite --config local-vite-config.js build
```

## Debugging

### Console Logging

We've included a robust logging system that works well in both Replit and local environments:

```typescript
// Import the logger
import { logger } from './server/debug-logger';

// Use different log levels
logger.debug('Detailed debug information - only shown in debug mode');
logger.info('Standard information messages');
logger.warn('Warning messages');
logger.error('Error messages', errorObject);

// You can also directly use console methods, but the logger
// provides better formatting and level control
console.log('This works too');
```

### Setting Log Levels

You can set the log level in several ways:

1. Command line: `node local-dev.js --debug`
2. Environment variable: `LOG_LEVEL=debug node local-dev.js`
3. In your .env file: `LOG_LEVEL=debug`

Available log levels (in order of verbosity):
- `debug` - Most verbose, shows all log messages
- `info` - Shows info, warnings, and errors (default)
- `warn` - Shows only warnings and errors
- `error` - Shows only errors

## Compatibility with Replit

The app is designed to work in both Replit and local environments, with specific adaptations for each:

### Key Differences

In Replit:
- Environment variables are stored in Replit Secrets
- Path resolution uses Replit-specific features
- WebSockets operate through Replit's proxied environment

In local development:
- Environment variables are loaded from .env file
- Path resolution uses Node.js standard features
- WebSockets connect directly to localhost

## Troubleshooting

### Common Issues and Solutions

1. **Database Connection Problems**
   - Error: `Error: connect ECONNREFUSED 127.0.0.1:5432`
   - Solution: Make sure PostgreSQL is running and your DATABASE_URL is correctly configured

2. **Missing Environment Variables**
   - Error: `Error: AUTH_SECRET is not defined`
   - Solution: Check your .env file and make sure all required variables are set

3. **WebSocket Connection Issues**
   - Error: `WebSocket connection to 'ws://localhost:5000/ws' failed`
   - Solution: Ensure you're using 0.0.0.0 as the host in your server setup, not localhost

4. **TypeScript Compilation Errors**
   - Error: `Cannot find module '../path-compat'`
   - Solution: Run with `node local-start.js` which properly handles TypeScript files

### Debug Tools

If you're experiencing issues, try these debugging approaches:

1. Run with verbose logging:
   ```bash
   node local-start.js --debug --verbose
   ```

2. Check database connectivity:
   ```bash
   # With PostgreSQL CLI tools
   psql -U postgres -h localhost -d kindred
   
   # Or using a simple test script
   echo "SELECT 1;" | psql $DATABASE_URL
   ```

3. Monitor WebSocket communication:
   - Open Chrome DevTools → Network tab → WS filter
   - Look for failed connection attempts and error messages

## Implementation Details

### Architecture

The app uses a layered approach to ensure compatibility:

1. **Base Layer**: Core application code, shared between environments
2. **Compatibility Layer**: Environment-specific adaptations (path-compat.js, env-loader.ts)
3. **Runner Layer**: Environment-specific entry points (local-start.js for local, Replit workflows for Replit)

### File Structure

- `.env.example` - Template for local environment variables
- `local-start.js` - Local development entry point using tsx
- `path-compat.js` - Path resolution compatibility layer
- `server/env-loader.ts` - Environment variable loading logic
- `server/debug-logger.ts` - Enhanced logging system

The application is designed to detect its environment automatically and use the appropriate strategies for path resolution, environment variables, and other platform-specific concerns.