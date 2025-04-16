// scripts/update-password.ts
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function updatePassword() {
  try {
    const username = 'FemTest';
    const newPassword = 'TestPassword';
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the user's password in the database
    const updatedUsers = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, username))
      .returning({ id: users.id, username: users.username });
    
    console.log(`Updated password for user:`, updatedUsers);
    console.log('Password update successful!');
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

// Run the function
updatePassword();