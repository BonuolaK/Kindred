import express, { Express } from "express";
import { Server } from "http";
import path from "path";
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from "vite";

// Get the directory name in a way that works both in Replit and locally
function getDirname() {
  try {
    // For Replit
    if (typeof (import.meta as any).dirname === 'string') {
      return (import.meta as any).dirname;
    }
  } catch (e) {
    // For local
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
  }
}

export function log(message: string, source = "express") {
  console.log(`[${source}] ${message}`);
}

export async function setupViteLocal(app: Express, server: Server) {
  const dirname = getDirname();
  const projectRoot = path.resolve(dirname, '..');
  
  log("Setting up Vite in local mode", "vite-local");
  
  try {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      root: path.resolve(projectRoot, "client"),
      resolve: {
        alias: {
          "@": path.resolve(projectRoot, "client", "src"),
          "@shared": path.resolve(projectRoot, "shared"),
          "@assets": path.resolve(projectRoot, "attached_assets"),
        },
      },
      appType: "custom",
    });

    app.use(vite.middlewares);
    
    log("Vite middleware configured successfully", "vite-local");
    
    // Route all non-API requests to Vite
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      // Skip Vite handling for API and WebSocket routes
      if (url.startsWith("/api") || 
          url.startsWith("/ws") || 
          url.startsWith("/rtc") || 
          url.startsWith("/basic-ws")) {
        return next();
      }
      
      try {
        // Serve the client app
        let template = path.resolve(projectRoot, "client", "index.html");
        
        // Check if file exists
        if (!require('fs').existsSync(template)) {
          log(`ERROR: index.html not found at ${template}`, "vite-local");
          res.status(500).send(`Template file not found at ${template}`);
          return;
        }
        
        res.setHeader("Content-Type", "text/html");
        res.end(await vite.transformIndexHtml(url, template));
      } catch (e) {
        const err = e as Error;
        vite.ssrFixStacktrace(err);
        console.error(err.stack);
        res.status(500).end(err.stack);
      }
    });
    
    return vite;
  } catch (error) {
    log(`ERROR setting up Vite: ${error}`, "vite-local");
    throw error;
  }
}

export function serveStaticLocal(app: Express) {
  const dirname = getDirname();
  const projectRoot = path.resolve(dirname, '..');
  const distPath = path.resolve(projectRoot, "dist", "public");
  
  log(`Serving static files from ${distPath}`, "vite-local");
  
  app.use(express.static(distPath));
  
  app.get("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    res.sendFile(indexPath);
  });
}