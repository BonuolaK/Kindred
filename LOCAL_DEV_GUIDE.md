# Local Development Guide

This guide explains how to run the Kindred app in a local development environment to avoid issues with `import.meta.dirname`.

## Problem

When running the application locally, you may encounter the following error:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
```

This happens because `import.meta.dirname` is a Replit-specific feature not available in all Node.js environments.

## Solution

We've created a compatibility layer that works in both Replit and local environments. This solution uses standard ESM modules and falls back to alternatives when `import.meta` is not available or doesn't have the `dirname` property.

## Running Locally

To run the app locally, use one of these approaches:

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