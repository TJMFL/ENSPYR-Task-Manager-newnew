import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  taskValidator, 
  insertTaskSchema, 
  insertAiMessageSchema,
  insertUserSchema,
  insertLocationSchema,
  insertReportSchema,
  TaskStatus,
  LocationType
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
  
  // Protect routes with authentication middleware
  apiRouter.use([
    '/tasks', 
    '/task-stats', 
    '/ai-messages', 
    '/extract-tasks',
    '/locations',
    '/reports'
  ], isAuthenticated);

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
      console.log("Task data received:", req.body);
      
      // Validate the input data first using our schema that accepts string dates
      const validatedData = insertTaskSchema.parse(req.body);
      
      // Create the task in the database
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
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
      const validData = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(id, validData);
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

  // Location endpoints
  apiRouter.get("/locations", async (req: Request, res: Response) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations", error: (error as Error).message });
    }
  });

  apiRouter.get("/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const location = await storage.getLocationById(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch location", error: (error as Error).message });
    }
  });

  apiRouter.get("/locations/type/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type;
      if (!Object.values(LocationType).includes(type as any)) {
        return res.status(400).json({ message: "Invalid location type" });
      }

      const locations = await storage.getLocationsByType(type);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations by type", error: (error as Error).message });
    }
  });

  apiRouter.post("/locations", async (req: Request, res: Response) => {
    try {
      // Set userId from session
      const locationData = {
        ...req.body,
        userId: req.session.userId
      };
      
      // Validate the input data
      const validatedData = insertLocationSchema.parse(locationData);
      
      // Create the location in the database
      const location = await storage.createLocation(validatedData);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid location data", 
          error: error.errors.map(e => e.message).join(', ') 
        });
      } else {
        res.status(500).json({ message: "Failed to create location", error: (error as Error).message });
      }
    }
  });

  apiRouter.patch("/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const location = await storage.getLocationById(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Validate the update data
      const validData = insertLocationSchema.partial().parse(req.body);
      const updatedLocation = await storage.updateLocation(id, validData);
      res.json(updatedLocation);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid location data", 
          error: error.errors.map(e => e.message).join(', ') 
        });
      } else {
        res.status(500).json({ message: "Failed to update location", error: (error as Error).message });
      }
    }
  });

  apiRouter.delete("/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const success = await storage.deleteLocation(id);
      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location", error: (error as Error).message });
    }
  });

  // Tasks by location endpoint
  apiRouter.get("/tasks/by-location/:locationId", async (req: Request, res: Response) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const tasks = await storage.getTasksByLocation(locationId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks by location", error: (error as Error).message });
    }
  });

  // Today's tasks endpoint
  apiRouter.get("/tasks/due-today", async (_req: Request, res: Response) => {
    try {
      const tasks = await storage.getTasksDueToday();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's tasks", error: (error as Error).message });
    }
  });

  // Report endpoints
  apiRouter.get("/reports", async (_req: Request, res: Response) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports", error: (error as Error).message });
    }
  });

  apiRouter.get("/reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }

      const report = await storage.getReportById(id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report", error: (error as Error).message });
    }
  });

  apiRouter.get("/reports/date-range", async (req: Request, res: Response) => {
    try {
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const reports = await storage.getReportsByDateRange(startDate, endDate);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports by date range", error: (error as Error).message });
    }
  });

  apiRouter.post("/reports", async (req: Request, res: Response) => {
    try {
      // Set userId from session
      const reportData = {
        ...req.body,
        userId: req.session.userId
      };
      
      // Validate the input data
      const validatedData = insertReportSchema.parse(reportData);
      
      // Create the report in the database
      const report = await storage.createReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid report data", 
          error: error.errors.map(e => e.message).join(', ') 
        });
      } else {
        res.status(500).json({ message: "Failed to create report", error: (error as Error).message });
      }
    }
  });

  apiRouter.delete("/reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }

      const success = await storage.deleteReport(id);
      if (!success) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report", error: (error as Error).message });
    }
  });

  // Generate daily report endpoint
  apiRouter.post("/reports/generate-daily", async (req: Request, res: Response) => {
    try {
      const dateParam = req.body.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Create start and end dates for the day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      // Get all tasks updated on that day
      const allTasks = await storage.getAllTasks();
      const tasksForDay = allTasks.filter(task => {
        if (task.timeCompleted) {
          const completedDate = new Date(task.timeCompleted);
          return completedDate >= startDate && completedDate <= endDate;
        }
        return false;
      });

      // Get tasks still in progress
      const inProgressTasks = allTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
      
      // Generate report summary
      let summary = `Daily Report for ${date.toLocaleDateString()}\n\n`;
      summary += `Completed Tasks: ${tasksForDay.length}\n`;
      summary += `Tasks In Progress: ${inProgressTasks.length}\n`;
      
      // Calculate time spent
      const totalMinutes = tasksForDay.reduce((total, task) => total + (task.timeSpent || 0), 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      summary += `Total Time Spent: ${hours}h ${minutes}m\n\n`;
      
      // Create task details as JSON
      const tasksSummary = JSON.stringify({
        completed: tasksForDay.map(task => ({
          id: task.id,
          title: task.title,
          timeSpent: task.timeSpent,
          location: task.locationId
        })),
        inProgress: inProgressTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status
        }))
      });
      
      // Create the report
      const reportData = {
        title: `Daily Report - ${date.toLocaleDateString()}`,
        type: "daily",
        startDate,
        endDate,
        summary,
        tasksSummary,
        userId: req.session.userId
      };
      
      const report = await storage.createReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate daily report", error: (error as Error).message });
    }
  });

  // Generate weekly report endpoint
  apiRouter.post("/reports/generate-weekly", async (req: Request, res: Response) => {
    try {
      const dateParam = req.body.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Create start and end dates for the week
      const startDate = new Date(date);
      startDate.setDate(date.getDate() - date.getDay()); // Sunday
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Saturday
      endDate.setHours(23, 59, 59, 999);
      
      // Get all tasks
      const allTasks = await storage.getAllTasks();
      
      // Get tasks completed during the week
      const completedTasks = allTasks.filter(task => {
        if (task.timeCompleted) {
          const completedDate = new Date(task.timeCompleted);
          return completedDate >= startDate && completedDate <= endDate;
        }
        return false;
      });
      
      // Get tasks still in progress
      const inProgressTasks = allTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
      
      // Get tasks due in the upcoming week
      const upcomingDate = new Date(endDate);
      upcomingDate.setDate(upcomingDate.getDate() + 7);
      
      const upcomingTasks = allTasks.filter(task => {
        if (task.dueDate && task.status !== TaskStatus.COMPLETED) {
          const dueDate = new Date(task.dueDate);
          return dueDate > endDate && dueDate <= upcomingDate;
        }
        return false;
      });
      
      // Generate report summary
      let summary = `Weekly Report for ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n\n`;
      summary += `Completed Tasks: ${completedTasks.length}\n`;
      summary += `Tasks In Progress: ${inProgressTasks.length}\n`;
      summary += `Upcoming Tasks: ${upcomingTasks.length}\n`;
      
      // Calculate time spent
      const totalMinutes = completedTasks.reduce((total, task) => total + (task.timeSpent || 0), 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      summary += `Total Time Spent: ${hours}h ${minutes}m\n\n`;
      
      // Create task details as JSON
      const tasksSummary = JSON.stringify({
        completed: completedTasks.map(task => ({
          id: task.id,
          title: task.title,
          timeSpent: task.timeSpent,
          location: task.locationId
        })),
        inProgress: inProgressTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status
        })),
        upcoming: upcomingTasks.map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority
        }))
      });
      
      // Create the report
      const reportData = {
        title: `Weekly Report - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        type: "weekly",
        startDate,
        endDate,
        summary,
        tasksSummary,
        userId: req.session.userId
      };
      
      const report = await storage.createReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate weekly report", error: (error as Error).message });
    }
  });

  // Register API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
