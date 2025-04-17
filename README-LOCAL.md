# Kindred Local Development Guide

This guide explains how to run the Kindred Dating App locally on your Windows machine.

## Quick Start

1. **Run the start script**

   Double-click the `start-local.bat` file in Windows Explorer, or run it from Command Prompt:
   ```
   start-local.bat
   ```

   This will:
   - Check if Node.js is installed
   - Install ts-node if needed
   - Create a .env file if it doesn't exist
   - Start the application with the necessary environment patches

2. **Access the application**

   Once started, the application will be available at http://localhost:5000

## How It Works

This local development solution provides compatibility between Replit and local Windows environments by:

1. **Patching `import.meta.dirname`**: The application uses Replit-specific features like `import.meta.dirname` that don't exist in standard Node.js. Our solution patches the global object to provide this functionality in local environments.

2. **Environment Detection**: The code automatically detects whether it's running in Replit or locally and uses the appropriate path resolution method.

3. **Minimal Changes**: Unlike other approaches, this solution doesn't require modifying the original files, making it easy to keep your code in sync with the Replit version.

## Troubleshooting

### Common Issues

1. **Node.js not found**
   - Install Node.js v16 or higher from https://nodejs.org/
   - Make sure Node.js is in your PATH

2. **Database connection errors**
   - Check your database credentials in the .env file
   - Make sure PostgreSQL is installed and running
   - Try connecting to the database with pgAdmin to verify the credentials

3. **"Module not found" errors**
   - Run `npm install` to install all required dependencies
   - Some dependencies might need to be installed manually with `npm install <package-name>`

4. **Path resolution errors**
   - If you see errors related to file paths, check the console output for more information
   - The application should log the detected project root directory

## Files Used for Local Development

- **local-run.js**: Main script that patches the environment and starts the server
- **start-local.bat**: Windows batch file for easy startup
- **test-path-utils.ts**: Utility functions for path resolution
- **test-paths.ts**: Test script for verifying path resolution

## Notes

- This solution is based on the specific commit `a9b4ac850115b3547923fa236e1da5cd8a6d900d`
- It's designed to work with minimal changes to the original codebase
- No files are modified permanently; all patches are applied at runtime