/**
 * Local version of server/index.ts
 * This file is compatible with both Replit and local environments
 */

import express, { NextFunction, Request, Response } from "express";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { setupBasicWebSocketServer } from "./basic-ws";
import { initDatabase } from "./db";
import { registerRoutes } from "./routes";
import { setupSocketServer } from "./socket";
import { setupWebRTCSignaling } from "./webrtc-signaling";
import path from "path";
import { fileURLToPath } from 'url';

// For local development
// Import dynamically to avoid errors in Replit
async function getLocalViteSetup() {
  try {
    return await import("./vite.local");
  } catch (error) {
    console.error("Error importing vite.local:", error);
    return null;
  }
}

// For Replit (original implementation)
// Import dynamically to avoid errors locally if this file doesn't exist
async function getReplitViteSetup() {
  try {
    return await import("./vite");
  } catch (error) {
    console.error("Error importing vite:", error);
    return null;
  }
}

// Get current directory
function getDirname() {
  try {
    // For Replit
    if (typeof (import.meta as any).dirname === 'string') {
      return (import.meta as any).dirname;
    }
  } catch (e) {
    // For local development
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
  }
}

async function main() {
  console.log("Starting Kindred server...");
  
  // Log important environment variables
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Local Development: ${process.env.LOCAL_DEVELOPMENT === 'true' ? 'Yes' : 'No'}`);
  
  // Initialize database
  await initDatabase();
  
  // Create Express app
  const app = express();
  app.use(express.json());
  
  // Set up authentication
  setupAuth(app);
  
  // Register API routes
  const server = await registerRoutes(app);
  
  // Set up WebSocket servers
  setupBasicWebSocketServer(server);
  setupSocketServer(server);
  setupWebRTCSignaling(server);
  
  // Set up Vite based on environment
  if (process.env.LOCAL_DEVELOPMENT === 'true') {
    console.log("Using local development Vite setup");
    const localVite = await getLocalViteSetup();
    if (localVite) {
      await localVite.setupViteLocal(app, server);
    } else {
      console.error("Failed to load local Vite setup");
    }
  } else {
    console.log("Using Replit Vite setup");
    const replitVite = await getReplitViteSetup();
    if (replitVite) {
      if (app.get("env") === "development") {
        await replitVite.setupVite(app, server);
      } else {
        replitVite.serveStatic(app);
      }
    } else {
      console.error("Failed to load Replit Vite setup");
    }
  }
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  });
  
  // Start the server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`App URL: http://localhost:${PORT}`);
  });
}

main().catch(console.error);