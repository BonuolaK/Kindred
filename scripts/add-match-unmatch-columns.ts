import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addUnmatchColumns() {
  console.log('Adding unmatch columns to matches table...');
  
  try {
    // Add the unmatched_by column
    await db.execute(sql`
      ALTER TABLE matches 
      ADD COLUMN IF NOT EXISTS unmatched_by INTEGER;
    `);
    console.log('✅ Added unmatched_by column');

    // Add the unmatched_date column
    await db.execute(sql`
      ALTER TABLE matches 
      ADD COLUMN IF NOT EXISTS unmatched_date TIMESTAMP;
    `);
    console.log('✅ Added unmatched_date column');
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
addUnmatchColumns().then(() => {
  console.log('Migration completed, exiting...');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});