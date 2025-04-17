# Local Development Guide

This guide explains how to run the Kindred app in a local development environment, handling both path compatibility issues and environment variables.

## Problem 1: Path Compatibility

When running the application locally, you may encounter the following error:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
```

This happens because `import.meta.dirname` is a Replit-specific feature not available in all Node.js environments.

## Problem 2: Environment Variables

The application requires certain environment variables that are automatically available in Replit but need to be explicitly set in local environments.

## Solutions

### Path Compatibility

We've created a compatibility layer that works in both Replit and local environments. This solution uses standard ESM modules and falls back to alternatives when `import.meta` is not available or doesn't have the `dirname` property.

### Environment Variables

Our `local-dev.js` script includes a simple .env file loader that automatically loads environment variables from a `.env` file in the project root.

## Setting Up for Local Development

1. **Create a `.env` file**:
   
   Copy the `.env.example` file to `.env` and fill in the necessary values:
   
   ```bash
   cp .env.example .env
   # Edit .env file with actual values
   ```

2. **Database Setup**:
   
   Make sure PostgreSQL is running, then update the database connection details in your `.env` file.

## Running Locally

To run the app locally, use one of these approaches:

### Option 1: Use the local-dev.js script (Recommended)

This is the recommended approach as it ensures proper path resolution and environment variable loading:

```bash
node local-dev.js
```

### Option 2: Import the path-compat module first

If you need to run specific scripts, ensure you import the path-compat module first and load environment variables manually:

```javascript
// Your script.js
// Load .env file manually
import 'dotenv/config';
// Import path compatibility layer
import './path-compat.js';
// Then the rest of your imports
import express from 'express';
// ...
```

### Option 3: Use local-vite-config.js for Vite

For Vite-specific operations, use the local-vite-config.js:

```bash
# Make sure to have a .env file in place first
vite --config local-vite-config.js dev
# or
vite --config local-vite-config.js build
```

## Technical Details

### Path Compatibility

1. The `path-compat.js` module detects the current environment
2. It provides helper functions (`getDirname()`, `getProjectRoot()`, `resolveFromRoot()`)
3. For Vite specifically, it exports pre-calculated path values (`viteAliases`, `viteRoot`, `viteOutDir`)

### Environment Variables

The `local-dev.js` script includes a simple .env file loader that:

1. Looks for a `.env` file in the project root
2. Parses key-value pairs
3. Sets them as environment variables if they're not already defined

## Notes on Implementation

- The solution is non-intrusive and doesn't require modifying existing config files
- No changes are needed to the server startup in the Replit environment
- It uses multiple fallback strategies to handle different edge cases
- Environment variables are handled automatically by Replit in production