import { 
  users, tasks, aiMessages, locations, reports,
  type User, type InsertUser, 
  type Task, type InsertTask,
  type AIMessage, type InsertAIMessage,
  type Location, type InsertLocation,
  type Report, type InsertReport
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

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
  getTasksByLocation(locationId: number): Promise<Task[]>;
  getTasksDueToday(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Location operations
  getAllLocations(): Promise<Location[]>;
  getLocationById(id: number): Promise<Location | undefined>;
  getLocationsByType(type: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, locationData: Partial<Location>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;
  
  // Report operations
  getAllReports(): Promise<Report[]>;
  getReportById(id: number): Promise<Report | undefined>;
  getReportsByDateRange(startDate: Date, endDate: Date): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  deleteReport(id: number): Promise<boolean>;
  
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

  async getTasksByLocation(locationId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.locationId, locationId));
  }

  async getTasksDueToday(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await db.select().from(tasks).where(
      and(
        gte(tasks.dueDate, today),
        lte(tasks.dueDate, tomorrow)
      )
    );
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    // Create a processed copy that safely handles date conversion
    const processedData: any = { ...taskData };
    
    // Convert dueDate from string to Date if it's a string
    if (processedData.dueDate && typeof processedData.dueDate === 'string') {
      processedData.dueDate = new Date(processedData.dueDate);
    }
    
    // Convert timeStarted from string to Date if it's a string
    if (processedData.timeStarted && typeof processedData.timeStarted === 'string') {
      processedData.timeStarted = new Date(processedData.timeStarted);
    }
    
    // Convert timeCompleted from string to Date if it's a string
    if (processedData.timeCompleted && typeof processedData.timeCompleted === 'string') {
      processedData.timeCompleted = new Date(processedData.timeCompleted);
    }
    
    // If status is "in_progress" and timeStarted is not set, set it to now
    if (processedData.status === 'in_progress' && !processedData.timeStarted) {
      processedData.timeStarted = new Date();
    }
    
    // If status is "completed" and timeCompleted is not set, set it to now
    if (processedData.status === 'completed' && !processedData.timeCompleted) {
      processedData.timeCompleted = new Date();
      
      // If timeStarted exists, calculate timeSpent in minutes
      if (processedData.timeStarted) {
        const startTime = processedData.timeStarted;
        const endTime = processedData.timeCompleted;
        const diffMs = endTime.getTime() - startTime.getTime();
        const diffMinutes = Math.round(diffMs / 60000);
        processedData.timeSpent = diffMinutes;
      }
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
    
    // Convert timeStarted from string to Date if it's a string
    if (processedData.timeStarted && typeof processedData.timeStarted === 'string') {
      processedData.timeStarted = new Date(processedData.timeStarted);
    }
    
    // Convert timeCompleted from string to Date if it's a string
    if (processedData.timeCompleted && typeof processedData.timeCompleted === 'string') {
      processedData.timeCompleted = new Date(processedData.timeCompleted);
    }
    
    // If status is changed to "in_progress" and timeStarted is not set, set it to now
    if (processedData.status === 'in_progress' && !processedData.timeStarted && !taskData.timeStarted) {
      processedData.timeStarted = new Date();
    }
    
    // If status is changed to "completed" and timeCompleted is not set, set it to now
    if (processedData.status === 'completed' && !processedData.timeCompleted && !taskData.timeCompleted) {
      processedData.timeCompleted = new Date();
      
      // If timeStarted exists, calculate timeSpent in minutes
      if (processedData.timeStarted || taskData.timeStarted) {
        const startTime = processedData.timeStarted || taskData.timeStarted;
        const endTime = processedData.timeCompleted;
        const diffMs = endTime.getTime() - startTime.getTime();
        const diffMinutes = Math.round(diffMs / 60000);
        processedData.timeSpent = diffMinutes;
      }
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

  // Location operations
  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocationById(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async getLocationsByType(type: string): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.type, type));
  }

  async createLocation(locationData: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(locationData).returning();
    return location;
  }

  async updateLocation(id: number, locationData: Partial<Location>): Promise<Location | undefined> {
    const [updatedLocation] = await db
      .update(locations)
      .set(locationData)
      .where(eq(locations.id, id))
      .returning();
    
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id));
    return !!result;
  }

  // Report operations
  async getAllReports(): Promise<Report[]> {
    return await db.select().from(reports);
  }

  async getReportById(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async getReportsByDateRange(startDate: Date, endDate: Date): Promise<Report[]> {
    return await db.select().from(reports).where(
      and(
        gte(reports.startDate, startDate),
        lte(reports.endDate, endDate)
      )
    );
  }

  async createReport(reportData: InsertReport): Promise<Report> {
    // Handle date conversion
    const processedData: any = { ...reportData };
    
    if (processedData.startDate && typeof processedData.startDate === 'string') {
      processedData.startDate = new Date(processedData.startDate);
    }
    
    if (processedData.endDate && typeof processedData.endDate === 'string') {
      processedData.endDate = new Date(processedData.endDate);
    }
    
    const [report] = await db.insert(reports).values(processedData).returning();
    return report;
  }

  async deleteReport(id: number): Promise<boolean> {
    const result = await db.delete(reports).where(eq(reports.id, id));
    return !!result;
  }
}

// Create and export storage instance
export const storage = new DatabaseStorage();
