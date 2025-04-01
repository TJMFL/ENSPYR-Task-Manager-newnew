import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type AIMessage = typeof aiMessages.$inferSelect;
export type InsertAIMessage = z.infer<typeof insertAiMessageSchema>;

// Extended schemas for validation
export const taskValidator = insertTaskSchema.extend({
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
  priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
});
