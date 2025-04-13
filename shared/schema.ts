import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Time slot type for call preferences
export const timeSlotSchema = z.object({
  start: z.string(), // Format: HH:MM in 24hr format
  end: z.string(),   // Format: HH:MM in 24hr format
});

// Call preferences schema
export const callPreferencesSchema = z.object({
  weekdays: z.array(timeSlotSchema).optional(),
  weekends: z.array(timeSlotSchema).optional(),
  notAvailable: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  dateOfBirth: text("date_of_birth"),
  age: integer("age"),
  gender: text("gender"),
  interestedGenders: text("interested_genders").array(),
  location: text("location"),
  bio: text("bio"),
  agePreferenceMin: integer("age_preference_min"),
  agePreferenceMax: integer("age_preference_max"),
  photoUrl: text("photo_url"),
  avatar: text("avatar"),
  isPhotoRevealed: boolean("is_photo_revealed").default(false).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  profileType: text("profile_type").default("basic").notNull(),
  communicationStyle: text("communication_style"),
  freeTimeActivities: text("free_time_activities").array(),
  values: text("values"),
  conflictResolution: text("conflict_resolution"),
  loveLanguage: text("love_language"),
  relationshipPace: text("relationship_pace"),
  dealbreakers: text("dealbreakers").array(),
  callPreferences: json("call_preferences").$type<z.infer<typeof callPreferencesSchema>>(),
  idVerified: boolean("id_verified").default(false),
  idVerificationImage: text("id_verification_image"),
  idVerificationSkipped: boolean("id_verification_skipped").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  questionnaireStep: integer("questionnaire_step").default(0),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  userId1: integer("user_id_1").notNull(),
  userId2: integer("user_id_2").notNull(),
  compatibility: integer("compatibility").notNull(),
  matchDate: timestamp("match_date").defaultNow().notNull(),
  callCount: integer("call_count").default(0).notNull(),
  lastCallDate: timestamp("last_call_date"),
  callScheduled: boolean("call_scheduled").default(false),
  scheduledCallTime: timestamp("scheduled_call_time"),
  isChatUnlocked: boolean("is_chat_unlocked").default(false),
  arePhotosRevealed: boolean("are_photos_revealed").default(false),
  status: text("status").default("active").notNull(), // active, declined, completed
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  initiatorId: integer("initiator_id"),
  receiverId: integer("receiver_id"),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  callDay: integer("call_day").notNull(), // 1, 2, 3, or 4+ for unlimited
  status: text("status").default('pending'), // pending, active, completed, missed, rejected
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  matchId: integer("match_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isPhotoRevealed: true,
  isPremium: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  matchDate: true,
  callCount: true,
  lastCallDate: true,
  isChatUnlocked: true,
  arePhotosRevealed: true,
  status: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
  isRead: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  startTime: true,
  endTime: true,
  duration: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
  name: z.string().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  interestedGenders: z.array(z.string()).optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  avatar: z.string().optional(),
  agePreferenceMin: z.number().optional(),
  agePreferenceMax: z.number().optional(),
  communicationStyle: z.string().optional(),
  freeTimeActivities: z.array(z.string()).optional(),
  values: z.string().optional(),
  conflictResolution: z.string().optional(),
  loveLanguage: z.string().optional(),
  relationshipPace: z.string().optional(),
  dealbreakers: z.array(z.string()).optional(),
  profileType: z.enum(["basic", "premium", "elite"]).optional(),
});

export const profileSchema = insertUserSchema.omit({
  username: true,
  password: true,
  email: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type ProfileData = z.infer<typeof profileSchema>;
