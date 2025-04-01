import { 
  users, tasks, aiMessages, 
  type User, type InsertUser, 
  type Task, type InsertTask,
  type AIMessage, type InsertAIMessage
} from "@shared/schema";

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

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private aiMessages: Map<number, AIMessage>;
  private userIdCounter: number;
  private taskIdCounter: number;
  private messageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.aiMessages = new Map();
    this.userIdCounter = 1;
    this.taskIdCounter = 1;
    this.messageIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Task operations
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.status === status
    );
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const now = new Date();
    const task: Task = { 
      ...taskData, 
      id, 
      createdAt: now 
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = { 
      ...task, 
      ...taskData 
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // AI Message operations
  async getAIMessages(limit?: number): Promise<AIMessage[]> {
    const messages = Array.from(this.aiMessages.values());
    messages.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return limit ? messages.slice(0, limit) : messages;
  }

  async createAIMessage(message: InsertAIMessage): Promise<AIMessage> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const aiMessage: AIMessage = {
      ...message,
      id,
      timestamp: now
    };
    this.aiMessages.set(id, aiMessage);
    return aiMessage;
  }
}

// Create and export storage instance
export const storage = new MemStorage();
