// Task status enum
export const TaskStatus = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// Task priority enum
export const TaskPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type TaskPriorityType = typeof TaskPriority[keyof typeof TaskPriority];

// Task interface
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate?: Date;
  category?: string;
  createdAt: Date;
  isAiGenerated?: number;
  source?: string;
  userId?: number;
}

// Task creation/update interface
export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatusType;
  priority?: TaskPriorityType;
  dueDate?: string;
  category?: string;
  isAiGenerated?: number;
  source?: string;
  userId?: number;
}

// Extracted task from AI
export interface ExtractedTask {
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriorityType;
  category?: string;
}

// AI message interface
export interface AIMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId?: number;
}

// Task statistics interface
export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}
