// local-vite-config.js
// This file is a wrapper for vite.config.ts to be used in local development
// It provides path compatibility for environments where import.meta is not available
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import path from "path";
import fs from "fs";

// Calculate project paths manually since we can't rely on import.meta
const projectRoot = process.cwd();
const clientDir = path.resolve(projectRoot, "client");
const distDir = path.resolve(projectRoot, "dist/public");

// Define aliases manually without relying on path-compat
const aliases = {
  "@": path.resolve(projectRoot, "client", "src"),
  "@shared": path.resolve(projectRoot, "shared"),
  "@assets": path.resolve(projectRoot, "attached_assets"),
};

// Log configuration for debugging
console.log("[local-vite-config] Loading configuration");
console.log("[local-vite-config] Project root:", projectRoot);
console.log("[local-vite-config] Client dir:", clientDir);
console.log("[local-vite-config] Aliases:", JSON.stringify(aliases, null, 2));

// Make sure theme.json exists, if not create a simple one
const themeJsonPath = path.resolve(projectRoot, "theme.json");
if (!fs.existsSync(themeJsonPath)) {
  console.log("[local-vite-config] Creating default theme.json");
  const defaultTheme = {
    "primary": "#9B1D54", // Kindred burgundy
    "variant": "tint", 
    "appearance": "system",
    "radius": 0.5
  };
  fs.writeFileSync(themeJsonPath, JSON.stringify(defaultTheme, null, 2));
}

// Define the configuration without relying on import.meta
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
  ],
  resolve: {
    alias: aliases,
  },
  root: clientDir,
  build: {
    outDir: distDir,
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0', // Allow connections from other devices on network
    port: 3000,
    strictPort: true,
    hmr: {
      clientPort: 3000, // Ensure consistent HMR port
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@tanstack/react-query', 
      'wouter',
      'zod',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'date-fns',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      'lucide-react',
    ],
  },
});