import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function updateUserSchema() {
  console.log('Starting user schema update...');
  
  try {
    // Add dateOfBirth column
    await db.execute(sql`
      ALTER TABLE IF EXISTS users 
      ADD COLUMN IF NOT EXISTS date_of_birth TEXT
    `);
    console.log('Added date_of_birth column');
    
    // Add idVerified column
    await db.execute(sql`
      ALTER TABLE IF EXISTS users 
      ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE
    `);
    console.log('Added id_verified column');
    
    // Add idVerificationImage column
    await db.execute(sql`
      ALTER TABLE IF EXISTS users 
      ADD COLUMN IF NOT EXISTS id_verification_image TEXT
    `);
    console.log('Added id_verification_image column');
    
    // Add idVerificationSkipped column
    await db.execute(sql`
      ALTER TABLE IF EXISTS users 
      ADD COLUMN IF NOT EXISTS id_verification_skipped BOOLEAN DEFAULT FALSE
    `);
    console.log('Added id_verification_skipped column');
    
    console.log('User schema update completed successfully!');
  } catch (error) {
    console.error('Error updating user schema:', error);
  }
}

// Run the migration
updateUserSchema().then(() => {
  console.log('Migration completed');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});