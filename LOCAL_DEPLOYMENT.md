# Kindred Dating App - Local Deployment Guide

This guide provides step-by-step instructions for deploying the Kindred Dating App locally on a Windows machine for testing and development.

## Prerequisites

1. **Node.js and npm**
   - Download and install the latest LTS version (16.x or higher) from [Node.js official website](https://nodejs.org/)
   - Verify installation by running `node -v` and `npm -v` in Command Prompt

2. **PostgreSQL**
   - Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)
   - During installation, note your admin password
   - Keep the default port (5432)

3. **Git** (optional, for cloning the repository)
   - Download and install from [Git for Windows](https://gitforwindows.org/)

## Setup Instructions

### Step 1: Clone or Download the Repository

If you have Git installed:
```bash
git clone <repository-url>
cd kindred-dating-app
```

Or download and extract the ZIP file from the repository.

### Step 2: Install Dependencies

```bash
npm install
```

Additionally, install the required development dependencies:
```bash
npm install --save-dev ts-node dotenv
```

### Step 3: Set Up Environment Variables

1. Create a `.env` file in the project root by copying the example:
   ```bash
   copy .env.example .env
   ```

2. Edit the `.env` file to set your PostgreSQL password and other configurations.

### Step 4: Set Up Database

1. Open pgAdmin (installed with PostgreSQL)
2. Log in with your admin password
3. Create a new database named "kindred"
4. Set up your database and create tables using Drizzle:
   ```bash
   npm run local:db:push
   ```

### Step 5: Add Scripts to package.json

Run the script to add local development scripts to package.json:
```bash
node update-package-json.js
```

This will add the following scripts:
- `local:start`: Start the application in local development mode
- `local:build`: Build the application for local deployment
- `local:db:push`: Push database schema changes to the local database
- `local:create-users`: Create dummy users for testing

### Step 6: Start the Application

Start the application in local development mode:
```bash
npm run local:start
```

The application should now be running at http://localhost:5000

### Step 7: Create Test Users (Optional)

To create test users for the application:
```bash
npm run local:create-users
```

## Troubleshooting

### Common Issues and Solutions

1. **Path Resolution Errors**
   - Our local deployment setup includes compatibility code to handle Replit-specific features
   - If you encounter any path-related errors, check the path resolution in the error message and verify it exists

2. **Database Connection Issues**
   - Verify PostgreSQL is running using Task Manager > Services
   - Check your connection string in the `.env` file
   - Try connecting manually using pgAdmin to confirm credentials

3. **WebSocket Connection Problems**
   - Check if any firewall is blocking WebSocket connections
   - Try disabling any antivirus or firewall temporarily for testing

4. **Port Conflicts**
   - If port 5000 is already in use, change the PORT value in your `.env` file

5. **Missing Dependencies**
   - If you encounter errors about missing dependencies, run `npm install` again
   - Specific missing modules might need to be installed individually

## How It Works

The local deployment setup uses the following files:

1. `shared/path-utils.ts`: Handles path resolution in both Replit and local environments
2. `vite.config.wrapper.ts`: Provides a Vite configuration that works locally
3. `local-bridge.js`: Swaps configuration files for local compatibility
4. `local-dev.js`: Entry point for local development
5. `server/vite.local.ts`: Local adaptation of Vite setup

This approach provides compatibility with Replit's environment while allowing local development and testing.

## Next Steps

After successfully deploying locally, you can:

1. Explore the codebase and make changes
2. Test WebSocket functionality manually
3. Verify database operations with the local PostgreSQL instance
4. Debug any issues that might be specific to the local environment

For assistance or to report issues, please contact the project maintainers.