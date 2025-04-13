import { users, matches, messages, callLogs, notes } from "@shared/schema";
import type { 
  User, InsertUser, Match, InsertMatch, 
  Message, InsertMessage, CallLog, InsertCallLog,
  Note, InsertNote
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Match operations
  getMatchById(id: number): Promise<Match | undefined>;
  getMatchesByUserId(userId: number): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, match: Partial<Match>): Promise<Match | undefined>;
  
  // Message operations
  getMessagesByMatchId(matchId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(matchId: number, userId: number): Promise<void>;
  
  // Call operations
  getCallLogsByMatchId(matchId: number): Promise<CallLog[]>;
  getCallLogById(id: number): Promise<CallLog | undefined>;
  createCallLog(callLog: InsertCallLog): Promise<CallLog>;
  updateCallLog(id: number, callLog: Partial<CallLog>): Promise<CallLog | undefined>;
  
  // Note operations
  getNotesByMatchId(matchId: number, userId: number): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<Note>): Promise<Note | undefined>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private matches: Map<number, Match>;
  private messages: Map<number, Message>;
  private callLogs: Map<number, CallLog>;
  private notes: Map<number, Note>;
  
  currentUserId: number;
  currentMatchId: number;
  currentMessageId: number;
  currentCallLogId: number;
  currentNoteId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.matches = new Map();
    this.messages = new Map();
    this.callLogs = new Map();
    this.notes = new Map();
    
    this.currentUserId = 1;
    this.currentMatchId = 1;
    this.currentMessageId = 1;
    this.currentCallLogId = 1;
    this.currentNoteId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    // Ensure nullable fields are properly handled
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      name: insertUser.name,
      age: insertUser.age ?? null,
      gender: insertUser.gender ?? null,
      interestedGenders: insertUser.interestedGenders ?? null,
      location: insertUser.location ?? null,
      bio: insertUser.bio ?? null,
      photoUrl: insertUser.photoUrl ?? null,
      communicationStyle: insertUser.communicationStyle ?? null,
      freeTimeActivities: insertUser.freeTimeActivities ?? null,
      values: insertUser.values ?? null,
      conflictResolution: insertUser.conflictResolution ?? null,
      loveLanguage: insertUser.loveLanguage ?? null,
      relationshipPace: insertUser.relationshipPace ?? null,
      dealbreakers: insertUser.dealbreakers ?? null,
      isPhotoRevealed: false,
      isPremium: false,
      createdAt: now,
      onboardingCompleted: false,
      questionnaireStep: 0
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Match methods
  async getMatchById(id: number): Promise<Match | undefined> {
    return this.matches.get(id);
  }
  
  async getMatchesByUserId(userId: number): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(
      (match) => match.userId1 === userId || match.userId2 === userId
    );
  }
  
  async createMatch(matchData: InsertMatch): Promise<Match> {
    const id = this.currentMatchId++;
    const now = new Date();
    const match: Match = {
      ...matchData,
      id,
      matchDate: now,
      callCount: 0,
      lastCallDate: null,
      callScheduled: false,
      scheduledCallTime: null,
      isChatUnlocked: false,
      arePhotosRevealed: false,
      status: 'active'
    };
    this.matches.set(id, match);
    return match;
  }
  
  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    const match = await this.getMatchById(id);
    if (!match) return undefined;
    
    const updatedMatch = { ...match, ...matchData };
    this.matches.set(id, updatedMatch);
    return updatedMatch;
  }
  
  // Message methods
  async getMessagesByMatchId(matchId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.matchId === matchId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }
  
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const now = new Date();
    const message: Message = {
      ...messageData,
      id,
      sentAt: now,
      isRead: false
    };
    this.messages.set(id, message);
    return message;
  }
  
  async markMessagesAsRead(matchId: number, userId: number): Promise<void> {
    const messagesToUpdate = Array.from(this.messages.values())
      .filter((message) => message.matchId === matchId && message.senderId !== userId);
    
    messagesToUpdate.forEach((message) => {
      this.messages.set(message.id, { ...message, isRead: true });
    });
  }
  
  // Call Log methods
  async getCallLogsByMatchId(matchId: number): Promise<CallLog[]> {
    return Array.from(this.callLogs.values())
      .filter((call) => call.matchId === matchId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  async getCallLogById(id: number): Promise<CallLog | undefined> {
    return this.callLogs.get(id);
  }
  
  async createCallLog(callLogData: InsertCallLog): Promise<CallLog> {
    const id = this.currentCallLogId++;
    const now = new Date();
    const callLog: CallLog = {
      ...callLogData,
      id,
      startTime: now,
      endTime: null,
      duration: null,
      initiatorId: callLogData.initiatorId || null,
      receiverId: callLogData.receiverId || null,
      status: callLogData.status || 'pending'
    };
    this.callLogs.set(id, callLog);
    return callLog;
  }
  
  async updateCallLog(id: number, callLogData: Partial<CallLog>): Promise<CallLog | undefined> {
    const callLog = this.callLogs.get(id);
    if (!callLog) return undefined;
    
    const updatedCallLog = { ...callLog, ...callLogData };
    this.callLogs.set(id, updatedCallLog);
    return updatedCallLog;
  }
  
  // Note methods
  async getNotesByMatchId(matchId: number, userId: number): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter((note) => note.matchId === matchId && note.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async createNote(noteData: InsertNote): Promise<Note> {
    const id = this.currentNoteId++;
    const now = new Date();
    const note: Note = {
      ...noteData,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.notes.set(id, note);
    return note;
  }
  
  async updateNote(id: number, noteData: Partial<Note>): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    
    const now = new Date();
    const updatedNote = { ...note, ...noteData, updatedAt: now };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }
}

import { DatabaseStorage } from "./database-storage";

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
