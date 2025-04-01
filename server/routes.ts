import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  taskValidator, 
  insertTaskSchema, 
  insertAiMessageSchema,
  insertUserSchema,
  TaskStatus
} from "@shared/schema";
import { extractTasksFromText } from "./ai";
import { ZodError } from "zod";
import bcrypt from "bcrypt";

// Define type for Request with session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create an API router
  const apiRouter = express.Router();

  // Tasks endpoints
  apiRouter.get("/tasks", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks", error: (error as Error).message });
    }
  });

  apiRouter.get("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task", error: (error as Error).message });
    }
  });

  apiRouter.post("/tasks", async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid task data", 
          error: error.errors.map(e => e.message).join(', ') 
        });
      } else {
        res.status(500).json({ message: "Failed to create task", error: (error as Error).message });
      }
    }
  });

  apiRouter.patch("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Validate the update data
      const updateData = taskValidator.partial().parse(req.body);
      const updatedTask = await storage.updateTask(id, updateData);
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid task data", 
          error: error.errors.map(e => e.message).join(', ') 
        });
      } else {
        res.status(500).json({ message: "Failed to update task", error: (error as Error).message });
      }
    }
  });

  apiRouter.delete("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task", error: (error as Error).message });
    }
  });

  // Task stats
  apiRouter.get("/task-stats", async (_req: Request, res: Response) => {
    try {
      const allTasks = await storage.getAllTasks();
      const todoTasks = allTasks.filter(task => task.status === TaskStatus.TODO);
      const inProgressTasks = allTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
      const completedTasks = allTasks.filter(task => task.status === TaskStatus.COMPLETED);
      
      const completionRate = allTasks.length > 0 
        ? Math.round((completedTasks.length / allTasks.length) * 100) 
        : 0;

      res.json({
        total: allTasks.length,
        todo: todoTasks.length,
        inProgress: inProgressTasks.length,
        completed: completedTasks.length,
        completionRate
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task statistics", error: (error as Error).message });
    }
  });

  // AI message endpoints
  apiRouter.get("/ai-messages", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const messages = await storage.getAIMessages(limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI messages", error: (error as Error).message });
    }
  });

  apiRouter.post("/ai-messages", async (req: Request, res: Response) => {
    try {
      const messageData = insertAiMessageSchema.parse(req.body);
      const message = await storage.createAIMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid message data", 
          error: error.errors.map(e => e.message).join(', ') 
        });
      } else {
        res.status(500).json({ message: "Failed to create message", error: (error as Error).message });
      }
    }
  });

  // AI task extraction endpoint
  apiRouter.post("/extract-tasks", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text content is required" });
      }

      const extractedTasks = await extractTasksFromText(text);
      res.json({ tasks: extractedTasks });
    } catch (error) {
      res.status(500).json({ message: "Failed to extract tasks", error: (error as Error).message });
    }
  });

  // Auth endpoints
  apiRouter.post("/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Save user info in session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      // Return user info (excluding password)
      res.status(201).json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid user data", 
          error: error.errors.map(e => e.message).join(', ') 
        });
      } else {
        res.status(500).json({ message: "Failed to register user", error: (error as Error).message });
      }
    }
  });
  
  apiRouter.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Save user info in session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      // Return user info (excluding password)
      res.json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed", error: (error as Error).message });
    }
  });
  
  apiRouter.post("/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout", error: err.message });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  apiRouter.get("/auth/user", (req: Request, res: Response) => {
    if (req.session.userId) {
      return res.json({
        id: req.session.userId,
        username: req.session.username
      });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // Protect task-related routes with authentication middleware
  apiRouter.use(['/tasks', '/task-stats', '/ai-messages', '/extract-tasks'], isAuthenticated);
  
  // Register API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
