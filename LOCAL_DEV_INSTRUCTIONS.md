# Kindred - Local Development Instructions

This document provides instructions for running the Kindred dating app in a local development environment.

## The Problem

When running the application locally, you might encounter errors like:

1. Error related to `import.meta.dirname` (a property available in Replit but not in standard Node.js):
```
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
    at __node_internal_captureLargerStackTrace (node:internal/errors:464:5)
    at new NodeError (node:internal/errors:371:5)
    at validateString (node:internal/validators:119:11)
    at Object.resolve (node:path:167:9)
    at null.<anonymous> (vite.config.ts:17:17)
```

2. Error about missing `tsx` command:
```
Failed to start server: Error: spawn tsx ENOENT
    at Process.ChildProcess._handle.onexit (node:internal/child_process:282:19)
    at onErrorNT (node:internal/child_process:477:16)
    at processTicksAndRejections (node:internal/process/task_queues:83:21)
```

## The Solution

We've created a robust compatibility layer that addresses these issues:

1. **dirname-polyfill.js**: A polyfill that adds the `import.meta.dirname` property to import.meta objects.
2. **dir-loader.js**: A Node.js ESM loader that patches module code to add the dirname property.
3. **start-local.js**: An enhanced script to start the application with multiple fallback mechanisms:
   - Checks for and installs dependencies automatically
   - Tries multiple approaches to run the server (tsx, npx, node)
   - Uses Shell with proper environment variables
4. **Convenience scripts**: `start-local.bat` for Windows and `start-local.sh` for Unix systems

## Running Locally

### Quick Start

The simplest way to run the application locally:

**Windows:**
```
start-local.bat
```

**Mac/Linux:**
```
chmod +x start-local.sh
./start-local.sh
```

**Any Platform (Node.js):**
```
node start-local.js
```

### First-Time Setup

If this is your first time running the application:

1. Make sure you have Node.js v18+ installed
2. Run `npm install` to install dependencies
3. Run one of the start scripts above

## How It Works

Our solution works in multiple layers to ensure compatibility:

1. **Environment Detection**: First, we check if you have the necessary tools installed (`tsx`, etc.) and install them if needed
2. **Polyfill Injection**: We add the missing `import.meta.dirname` property using standard Node.js functionality
3. **Loader Integration**: The custom loader ensures all modules have access to the polyfill
4. **Fallback Mechanisms**: If one approach fails, the script automatically tries alternative methods

This ensures the application can run both in Replit's environment and locally without any code changes or modifications to the core configuration files.

## Troubleshooting

If you encounter issues:

1. **Missing Dependencies**:
   ```
   npm install
   npm install -g tsx
   ```

2. **Permission Errors**:
   ```
   # For Unix/Linux/Mac
   chmod +x start-local.sh
   
   # For Windows (run as administrator)
   ```

3. **TypeScript/Node.js Version Issues**:
   Make sure you're using Node.js v18+ and have TypeScript installed:
   ```
   npm install -g typescript
   ```

4. **Manual Start**:
   If all else fails, you can run the server directly with:
   ```
   NODE_OPTIONS='--experimental-loader ./dir-loader.js' npx tsx server/index.ts
   ```