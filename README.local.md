# Kindred Dating App - Local Development Guide

This guide explains how to run the Kindred Dating App locally on your machine.

## Prerequisites

1. Node.js (v16 or higher)
2. PostgreSQL database
3. Git (optional)

## Quick Start for Windows

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd kindred-dating-app
   ```

   Or download and extract the ZIP if you don't have Git.

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy the example environment file
   copy .env.example .env
   ```

   Then edit the `.env` file to add your database connection details and secrets.

4. **Set up the database**

   Create a PostgreSQL database named "kindred" and run:

   ```bash
   # Use the provided script to push the schema
   node local-dev.js npx drizzle-kit push:pg
   ```

5. **Start the development server**

   ```bash
   # Start the server with the compatibility layer
   node local-dev.js node server/index.ts
   ```

   The application will be available at http://localhost:5000

## How It Works

The local development setup uses a compatibility layer that allows the Replit-specific code to run in a standard Node.js environment. This works by:

1. The `shared/path-utils.ts` file provides cross-environment path utilities
2. The `vite.config.wrapper.ts` file is used instead of `vite.config.ts` in local environments
3. The `local-bridge.js` script swaps configs as needed and restores them afterward
4. The `local-dev.js` script sets up the environment and runs commands through the bridge

## Available Commands

- `node local-dev.js node server/index.ts` - Start the development server
- `node local-dev.js npx drizzle-kit push:pg` - Update database schema
- `node local-dev.js npx tsx scripts/create-dummy-users.ts` - Create dummy users

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Make sure you've run `npm install` to install all dependencies
   - The compatibility layer might need additional modules; install them as needed

2. **Database connection errors**
   - Check your database credentials in the `.env` file
   - Ensure PostgreSQL is running and accessible

3. **WebSocket connection issues**
   - The WebSocket server runs on `/ws` path; make sure it's not blocked by firewall
   - Check browser console for specific error messages

4. **Path resolution errors**
   - If you encounter path resolution issues, check that the compatibility layer is working
   - Look at the console output for clues about which paths are being resolved incorrectly

### Getting Help

If you encounter issues not covered in this guide:
1. Check the error messages carefully for clues
2. Look at server logs for more detailed information
3. Contact the development team for assistance