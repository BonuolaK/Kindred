# Kindred - Local Development Instructions

This document provides instructions for running the Kindred dating app in a local development environment.

## The Problem

When running the application locally, you might encounter an error related to `import.meta.dirname`, which is a property available in the Replit environment but not in standard Node.js:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
    at __node_internal_captureLargerStackTrace (node:internal/errors:464:5)
    at new NodeError (node:internal/errors:371:5)
    at validateString (node:internal/validators:119:11)
    at Object.resolve (node:path:167:9)
    at null.<anonymous> (vite.config.ts:17:17)
```

## The Solution

We've created a compatibility layer that addresses this issue when running locally:

1. **dirname-polyfill.js**: A polyfill that adds the `import.meta.dirname` property to import.meta objects.
2. **dir-loader.js**: A Node.js ESM loader that patches module code to add the dirname property.
3. **start-local.js**: A script to start the application with the necessary configuration.

## Running Locally

To run the application locally, instead of using the default `npm run dev` command, use:

```bash
# Start the app with import.meta.dirname polyfill support
node start-local.js
```

Or you can modify your package.json to include:

```json
"scripts": {
  "dev:local": "node start-local.js"
}
```

And then run:

```bash
npm run dev:local
```

## How It Works

The polyfill approach works in several layers:

1. First, we detect if `import.meta.dirname` is missing in the current environment
2. If missing, we provide a polyfill implementation using Node.js's `fileURLToPath` and `path.dirname`
3. The loader ensures this polyfill is applied to all modules that might use `import.meta.dirname`

This ensures the application can run both in Replit's environment and locally without any code changes or modifications to the core configuration files.

## Troubleshooting

If you encounter issues:

1. Make sure you have Node.js v18+ installed
2. Ensure your environment supports ESM modules (`"type": "module"` in package.json)
3. Check that the path to start-local.js is correct

For more advanced scenarios, you can use the `--experimental-loader` option directly:

```bash
NODE_OPTIONS='--experimental-loader ./dir-loader.js' npm run dev
```