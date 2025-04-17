# Local Development Guide for Kindred

This guide explains how to run the Kindred dating app in a local development environment with PostgreSQL database support.

## Prerequisites

Before running the application locally, ensure you have:

1. Node.js (version 18 or higher recommended)
2. PostgreSQL installed and running (or connection details to a remote PostgreSQL instance)
3. Git to clone the repository

## Setting Up Local Environment

### 1. Clone the repository

```bash
git clone <repository-url> kindred
cd kindred
```

### 2. Install dependencies

```bash
npm install
# You may need to install dotenv if not already included
npm install dotenv --save-dev
```

### 3. Create a .env file

Create a `.env` file in the project root with your PostgreSQL connection details:

```
DATABASE_URL=postgresql://username:password@localhost:5432/kindred
SESSION_SECRET=your_session_secret
# If you're using Google authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
AUTH_SECRET=your_auth_secret
```

Replace the placeholders with your actual PostgreSQL credentials.

### 4. Run the application

Use our custom local development script, which handles path resolution and database connections:

```bash
node local-dev.js
```

The server should start and connect to your PostgreSQL database.

## Technical Details

### Path Resolution

We've implemented a robust solution for path resolution that works in both Replit and local environments. This addresses the common error:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
```

Our solution:

1. `path-compat.js` - Provides environment detection and fallback mechanisms
2. `local-dev.js` - Custom starter script that properly loads environment variables
3. `local-vite-config.js` - Vite configuration that works without requiring `import.meta`

### Database Connections

The application automatically detects whether to use:

- **Neon PostgreSQL** (for production/Replit)
- **Local PostgreSQL** (for development)

This is handled in `server/db.ts`, which checks the connection string and environment variables.

### Development Server

When running locally, the server:

1. Automatically loads environment variables from `.env`
2. Connects to your local PostgreSQL instance
3. Serves the front-end using Vite on port 3000
4. Provides detailed logging for debugging

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify your PostgreSQL server is running: `pg_isready`
2. Check your DATABASE_URL in the .env file
3. Ensure your database user has proper permissions

### Import Meta Error

If you still encounter `import.meta` issues:

1. Make sure you're using `node local-dev.js` instead of a direct `npm run` command
2. Check that path-compat.js is being loaded before any other module

### WebSocket Connection Issues

For WebSocket connection problems:

1. WebSockets run on the same port as the HTTP server
2. Check for any firewall or proxy issues
3. Look for CORS errors in the browser console