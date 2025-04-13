import { db } from './db';
import { 
  users, matches, messages, callLogs, notes,
  type User, type InsertUser, 
  type Match, type InsertMatch,
  type Message, type InsertMessage,
  type CallLog, type InsertCallLog,
  type Note, type InsertNote
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, or, desc, not, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from 'pg';
const { Pool } = pg;

const PostgresSessionStore = connectPg(session);

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export class DatabaseStorage implements IStorage {
  sessionStore: any; // session.SessionStore

  constructor() {
    // Create the session table manually
    this.createSessionTable().then(() => {
      console.log("Session table created or verified");
    }).catch(err => {
      console.error("Error creating session table:", err);
    });
    
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session'
    });
  }
  
  // Helper method to create session table
  private async createSessionTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        )
      `);
    } catch (error) {
      console.error("Error creating session table:", error);
      throw error;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error in updateUser:", error);
      return undefined;
    }
  }

  // Match operations
  async getMatchById(id: number): Promise<Match | undefined> {
    try {
      const [match] = await db.select().from(matches).where(eq(matches.id, id));
      return match;
    } catch (error) {
      console.error("Error in getMatchById:", error);
      return undefined;
    }
  }

  async getMatchesByUserId(userId: number): Promise<Match[]> {
    try {
      // Only get active matches and exclude any where the user initiated an unmatch
      const userMatches = await db
        .select()
        .from(matches)
        .where(
          and(
            or(eq(matches.userId1, userId), eq(matches.userId2, userId)),
            eq(matches.status, 'active'),
            // Ensure the user is not the one who unmatched (cannevermatch concept)
            or(
              isNull(matches.unmatchedBy),
              not(eq(matches.unmatchedBy, userId))
            )
          )
        );
      return userMatches;
    } catch (error) {
      console.error("Error in getMatchesByUserId:", error);
      return [];
    }
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    try {
      const [match] = await db.insert(matches).values(matchData).returning();
      return match;
    } catch (error) {
      console.error("Error in createMatch:", error);
      throw error;
    }
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    try {
      const [updatedMatch] = await db
        .update(matches)
        .set(matchData)
        .where(eq(matches.id, id))
        .returning();
      return updatedMatch;
    } catch (error) {
      console.error("Error in updateMatch:", error);
      return undefined;
    }
  }

  // Message operations
  async getMessagesByMatchId(matchId: number): Promise<Message[]> {
    try {
      const matchMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.matchId, matchId))
        .orderBy(messages.sentAt);
      return matchMessages;
    } catch (error) {
      console.error("Error in getMessagesByMatchId:", error);
      return [];
    }
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    try {
      const [message] = await db.insert(messages).values(messageData).returning();
      return message;
    } catch (error) {
      console.error("Error in createMessage:", error);
      throw error;
    }
  }

  async markMessagesAsRead(matchId: number, userId: number): Promise<void> {
    try {
      // Since we don't have a receiverId field, mark messages as read where the user is not the sender
      await db
        .update(messages)
        .set({ isRead: true })
        .where(and(
          eq(messages.matchId, matchId),
          eq(messages.isRead, false),
          // Messages where the user is not the sender
          not(eq(messages.senderId, userId))
        ));
    } catch (error) {
      console.error("Error in markMessagesAsRead:", error);
    }
  }

  // Call operations
  async getCallLogsByMatchId(matchId: number): Promise<CallLog[]> {
    try {
      // Use a different variable name to avoid conflicts with the table name
      const logs = await db
        .select()
        .from(callLogs)
        .where(eq(callLogs.matchId, matchId))
        .orderBy(desc(callLogs.startTime));
      return logs;
    } catch (error) {
      console.error("Error in getCallLogsByMatchId:", error);
      return [];
    }
  }
  
  async getCallLogById(id: number): Promise<CallLog | undefined> {
    try {
      const [callLog] = await db
        .select()
        .from(callLogs)
        .where(eq(callLogs.id, id));
      return callLog;
    } catch (error) {
      console.error("Error in getCallLogById:", error);
      return undefined;
    }
  }

  async createCallLog(callLogData: InsertCallLog): Promise<CallLog> {
    try {
      const [callLog] = await db.insert(callLogs).values(callLogData).returning();
      return callLog;
    } catch (error) {
      console.error("Error in createCallLog:", error);
      throw error;
    }
  }

  async updateCallLog(id: number, callLogData: Partial<CallLog>): Promise<CallLog | undefined> {
    try {
      const [updatedCallLog] = await db
        .update(callLogs)
        .set(callLogData)
        .where(eq(callLogs.id, id))
        .returning();
      return updatedCallLog;
    } catch (error) {
      console.error("Error in updateCallLog:", error);
      return undefined;
    }
  }

  // Note operations
  async getNotesByMatchId(matchId: number, userId: number): Promise<Note[]> {
    try {
      const userNotes = await db
        .select()
        .from(notes)
        .where(and(
          eq(notes.matchId, matchId),
          eq(notes.userId, userId)
        ))
        .orderBy(desc(notes.createdAt));
      return userNotes;
    } catch (error) {
      console.error("Error in getNotesByMatchId:", error);
      return [];
    }
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    try {
      const [note] = await db.insert(notes).values(noteData).returning();
      return note;
    } catch (error) {
      console.error("Error in createNote:", error);
      throw error;
    }
  }

  async updateNote(id: number, noteData: Partial<Note>): Promise<Note | undefined> {
    try {
      const [updatedNote] = await db
        .update(notes)
        .set(noteData)
        .where(eq(notes.id, id))
        .returning();
      return updatedNote;
    } catch (error) {
      console.error("Error in updateNote:", error);
      return undefined;
    }
  }
}