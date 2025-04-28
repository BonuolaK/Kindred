import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { log } from "./vite";
import dotenv from "dotenv";
dotenv.config();

// Use a connection string with explicit configuration parameters
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

// Note: neon client doesn't support .on() event handlers

let db;

if (connectionString.includes("neon.tech")) {
  if (!connectionString.includes("connection_limit")) {
    connectionString += (connectionString.includes("?") ? "&" : "?") + 
      "connection_limit=5&pool_timeout=10";
  }
  const sql = neon(connectionString);
  db = drizzleNeon(sql);
} else {
  const sql = postgres(connectionString, {
    ssl: false,
  });
  db = drizzlePostgres(sql);
}

export { db };

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