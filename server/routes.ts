import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  taskValidator, 
  insertTaskSchema, 
  insertAiMessageSchema,
  TaskStatus
} from "@shared/schema";
import { extractTasksFromText } from "./ai";
import { ValidationError, fromZodError } from "zod-validation-error";

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
      if (error instanceof Error) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: "Invalid task data", error: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create task", error: "Unknown error" });
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
      if (error instanceof Error) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: "Invalid task data", error: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to update task", error: "Unknown error" });
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
      if (error instanceof Error) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: "Invalid message data", error: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create message", error: "Unknown error" });
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

  // Register API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
