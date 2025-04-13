import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addCallPreferencesColumn() {
  console.log("Adding call_preferences column to users table...");

  try {
    // Check if column already exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'call_preferences'
    `);

    if (result.rows.length > 0) {
      console.log("Column call_preferences already exists. Skipping.");
      return;
    }

    // Add the column
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN call_preferences jsonb DEFAULT NULL
    `);

    console.log("Successfully added call_preferences column.");
  } catch (error) {
    console.error("Error adding call_preferences column:", error);
    throw error;
  }
}

// Run the migration
addCallPreferencesColumn()
  .then(() => {
    console.log("Migration completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });