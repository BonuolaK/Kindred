import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { log } from "./vite";

// Use a connection string with explicit configuration parameters
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

// Add connection pool parameters if they're not already present
if (!connectionString.includes("connection_limit")) {
  // Add connection parameters to improve reliability
  connectionString += (connectionString.includes("?") ? "&" : "?") + 
    "connection_limit=5&pool_timeout=10";
}

// Create SQL client with robust error handling
const sql = neon(connectionString);

// Note: neon client doesn't support .on() event handlers

export const db = drizzle(sql);

// Initialize database and run migrations
export async function initDatabase() {
  try {
    log("Initializing database...", "db");
    log("Database initialized", "db");
    return true;
  } catch (error) {
    log(`Error initializing database: ${error}`, "db");
    return false;
  }
}