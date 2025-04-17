# Local Development Guide

This guide explains how to run the Kindred app in a local development environment.

## Problem

When running the application locally, you may encounter the following errors:

1. Path resolution issues:
```
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
```

2. Missing environment variables:
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

These issues occur because Replit-specific features like `import.meta.dirname` and Replit Secrets aren't available in local environments.

## Solution

We've created two compatibility layers:

1. **Path compatibility** - Works in both Replit and local environments by providing a reliable way to resolve file paths.
2. **Environment variable loader** - Loads variables from a local `.env` file when running outside of Replit.

## Setting Up Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your configuration:
   - Set up a local PostgreSQL database
   - Configure authentication secrets
   - Add other required environment variables

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

## How It Works

1. The `path-compat.js` module detects the current environment
2. It provides helper functions (`getDirname()`, `getProjectRoot()`, `resolveFromRoot()`)
3. For Vite specifically, it exports pre-calculated path values (`viteAliases`, `viteRoot`, `viteOutDir`)

## Notes on Implementation

- The solution is non-intrusive and doesn't require modifying existing config files
- No changes are needed to the server startup in the Replit environment
- It uses multiple fallback strategies to handle different edge cases