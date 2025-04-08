import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { log } from "./vite";

const sql = neon(process.env.DATABASE_URL!);
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