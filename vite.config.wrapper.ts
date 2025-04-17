/**
 * This file is used as a wrapper for vite.config.ts
 * It exports the same configuration but uses the path-utils.ts module
 * to resolve paths in a way that works in both Replit and local environments
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { resolvePath, getProjectRoot } from "./shared/path-utils";

function getResolvedConfig() {
  return defineConfig({
    plugins: [
      react(),
      runtimeErrorOverlay(),
      themePlugin(),
      // Cartographer disabled in production
      ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined ? [] : []),
    ],
    resolve: {
      alias: {
        "@": resolvePath("client", "src"),
        "@shared": resolvePath("shared"),
        "@assets": resolvePath("attached_assets"),
      },
    },
    root: resolvePath("client"),
    build: {
      outDir: resolvePath("dist/public"),
      emptyOutDir: true,
    },
  });
}

// Export the configuration
export default getResolvedConfig();