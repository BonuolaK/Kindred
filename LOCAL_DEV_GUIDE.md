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

### Option 1: Use the local-dev.js script

This is the recommended approach as it ensures proper path resolution:

```bash
node local-dev.js
```

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

## How It Works

1. The `path-compat.js` module detects the current environment
2. It provides helper functions (`getDirname()`, `getProjectRoot()`, `resolveFromRoot()`)
3. For Vite specifically, it exports pre-calculated path values (`viteAliases`, `viteRoot`, `viteOutDir`)

## Notes on Implementation

- The solution is non-intrusive and doesn't require modifying existing config files
- No changes are needed to the server startup in the Replit environment
- It uses multiple fallback strategies to handle different edge cases