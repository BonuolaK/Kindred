// local-vite-config.js
// This file is a wrapper for vite.config.ts to be used in local development
// It provides path compatibility for environments where import.meta is not available
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import path from "path";

// Import the path compatibility helpers
import { viteAliases, viteRoot, viteOutDir } from "./path-compat.js";

// Define the configuration without relying on import.meta
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    // Cartographer disabled in production
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined ? [] : []),
  ],
  resolve: {
    alias: viteAliases,
  },
  root: viteRoot,
  build: {
    outDir: viteOutDir,
    emptyOutDir: true,
  },
});