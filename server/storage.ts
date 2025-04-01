import { 
  users, tasks, aiMessages, 
  type User, type InsertUser, 
  type Task, type InsertTask,
  type AIMessage, type InsertAIMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task operations
  getAllTasks(): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  getTasksByStatus(status: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // AI Message operations
  getAIMessages(limit?: number): Promise<AIMessage[]>;
  createAIMessage(message: InsertAIMessage): Promise<AIMessage>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Task operations
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.status, status));
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    // Create a processed copy that safely handles date conversion
    const processedData: any = { ...taskData };
    
    // Convert dueDate from string to Date if it's a string
    if (processedData.dueDate && typeof processedData.dueDate === 'string') {
      processedData.dueDate = new Date(processedData.dueDate);
    }
    
    const [task] = await db.insert(tasks).values(processedData).returning();
    return task;
  }

  async updateTask(id: number, taskData: Partial<Task> | any): Promise<Task | undefined> {
    // Handle date string conversion if needed
    const processedData = { ...taskData };
    
    // Convert dueDate from string to Date if it's a string
    if (processedData.dueDate && typeof processedData.dueDate === 'string') {
      processedData.dueDate = new Date(processedData.dueDate);
    }
    
    const [updatedTask] = await db
      .update(tasks)
      .set(processedData)
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return !!result;
  }

  // AI Message operations
  async getAIMessages(limit?: number): Promise<AIMessage[]> {
    const query = db.select().from(aiMessages).orderBy(desc(aiMessages.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }

  async createAIMessage(message: InsertAIMessage): Promise<AIMessage> {
    const [aiMessage] = await db.insert(aiMessages).values(message).returning();
    return aiMessage;
  }
}

// Create and export storage instance
export const storage = new DatabaseStorage();
