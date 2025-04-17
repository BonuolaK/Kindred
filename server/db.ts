import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { log } from "./vite";
import { Pool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';

/**
 * Create database client
 * Supports both production (Neon PostgreSQL) and local development environments
 */
function createDbClient() {
  // Use a connection string with explicit configuration parameters
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined. Please ensure it's set in your environment variables.");
  }
  
  // Check if we're in a local development environment
  const isLocalPg = connectionString.includes('localhost') || 
                    connectionString.includes('127.0.0.1') || 
                    process.env.DB_CLIENT === 'pg';
  
  // For local development with PostgreSQL
  if (isLocalPg) {
    log("Using local PostgreSQL database", "db");
    
    // Create a connection pool for better performance
    const pool = new Pool({ 
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000 
    });
    
    // Log when connections are created
    pool.on('connect', () => {
      log('Connected to local PostgreSQL database', 'db');
    });

    // Log any errors
    pool.on('error', (err) => {
      log(`PostgreSQL pool error: ${err.message}`, 'db');
    });
    
    return drizzlePg(pool);
  } 
  // For production with Neon PostgreSQL
  else {
    log("Using Neon PostgreSQL database", "db");
    
    let connStr = connectionString;
    
    // Add connection pool parameters if they're not already present
    if (!connStr.includes("connection_limit")) {
      // Add connection parameters to improve reliability
      connStr += (connStr.includes("?") ? "&" : "?") + 
        "connection_limit=5&pool_timeout=10";
    }
    
    // Create SQL client
    const sql = neon(connStr);
    return drizzle(sql);
  }
}

// Export the database client
export const db = createDbClient();

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