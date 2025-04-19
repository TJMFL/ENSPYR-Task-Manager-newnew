import { pgTable, text, serial, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// Export operators for use in API routes
export { eq, and, gte, lte, desc };

// Task status enum
export const TaskStatus = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

// Task priority enum
export const TaskPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

// Location type enum
export const LocationType = {
  AIRBNB: "airbnb",
  EVENT_VENUE: "event_venue",
  OFFICE: "office",
  OTHER: "other",
} as const;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Location schema for Airbnb and event venues
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  type: text("type").notNull().default(LocationType.OTHER),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

// Task schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default(TaskStatus.TODO),
  priority: text("priority").notNull().default(TaskPriority.MEDIUM),
  dueDate: timestamp("due_date"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
  isAiGenerated: integer("is_ai_generated").default(0),
  source: text("source"),
  userId: integer("user_id").references(() => users.id),
  // New fields
  locationId: integer("location_id").references(() => locations.id),
  timeSpent: integer("time_spent"), // Time spent in minutes
  timeStarted: timestamp("time_started"), // When the task was started
  timeCompleted: timestamp("time_completed"), // When the task was completed
  photoUrl: text("photo_url"), // URL to completed task photo
});

// Create the base schema
const baseInsertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

// Override the dueDate field to accept string or date
export const insertTaskSchema = baseInsertTaskSchema.extend({
  dueDate: z.union([z.string(), z.date(), z.null()]).optional(),
});

// AI message schema
export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  timestamp: true,
});

// Report schema for daily and weekly reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // "daily" or "weekly"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  summary: text("summary").notNull(),
  tasksSummary: text("tasks_summary"), // JSON string containing tasks summary
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

// Session schema for connect-pg-simple
export const session = pgTable("session", {
  sid: text("sid").notNull().primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Extended schemas for validation
export const taskValidator = insertTaskSchema.extend({
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
  priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type AIMessage = typeof aiMessages.$inferSelect;
export type InsertAIMessage = z.infer<typeof insertAiMessageSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
