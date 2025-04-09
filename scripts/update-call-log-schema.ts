import { db } from "../server/db";
import { callLogs } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateCallLogs() {
  console.log('Starting migration of call_logs table...');
  
  try {
    // Check if the new columns already exist
    const checkColumnsSQL = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'call_logs' 
      AND column_name IN ('initiator_id', 'receiver_id', 'status');
    `;
    
    const existingColumns = await db.execute(checkColumnsSQL);
    const columnNames = existingColumns.rows.map((row: any) => row.column_name);
    
    console.log('Existing columns:', columnNames);
    
    // Add initiator_id if it doesn't exist
    if (!columnNames.includes('initiator_id')) {
      console.log('Adding initiator_id column...');
      await db.execute(sql`
        ALTER TABLE call_logs 
        ADD COLUMN initiator_id INTEGER;
      `);
    }
    
    // Add receiver_id if it doesn't exist
    if (!columnNames.includes('receiver_id')) {
      console.log('Adding receiver_id column...');
      await db.execute(sql`
        ALTER TABLE call_logs 
        ADD COLUMN receiver_id INTEGER;
      `);
    }
    
    // Add status if it doesn't exist
    if (!columnNames.includes('status')) {
      console.log('Adding status column...');
      await db.execute(sql`
        ALTER TABLE call_logs 
        ADD COLUMN status TEXT DEFAULT 'pending';
      `);
    }
    
    // Update existing records to have some reasonable defaults
    console.log('Updating existing records with default values...');
    
    // For each call, set the initiator as the first user in the match and the receiver as the second
    const updateSQL = sql`
      UPDATE call_logs cl
      SET 
        initiator_id = m.user_id_1,
        receiver_id = m.user_id_2,
        status = CASE
          WHEN cl.end_time IS NOT NULL THEN 'completed'
          ELSE 'pending'
        END
      FROM matches m
      WHERE cl.match_id = m.id
      AND (cl.initiator_id IS NULL OR cl.receiver_id IS NULL OR cl.status IS NULL);
    `;
    
    await db.execute(updateSQL);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Execute the migration
migrateCallLogs()
  .then(() => {
    console.log('Script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });