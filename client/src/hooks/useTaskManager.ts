import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskInput, TaskStatus, TaskStatusType, ExtractedTask } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useTaskManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch all tasks
  const { 
    data: tasks = [] as Task[], 
    isLoading: tasksLoading,
    error: tasksError 
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch task statistics
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['/api/task-stats'],
  });

  // Group tasks by status
  const todoTasks: Task[] = tasks.filter((task: Task) => task.status === TaskStatus.TODO);
  const inProgressTasks: Task[] = tasks.filter((task: Task) => task.status === TaskStatus.IN_PROGRESS);
  const completedTasks: Task[] = tasks.filter((task: Task) => task.status === TaskStatus.COMPLETED);

  // AI-generated tasks
  const aiGeneratedTasks: Task[] = tasks.filter((task: Task) => task.isAiGenerated);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskInput) => {
      // Convert empty due date strings to undefined
      if (taskData.dueDate === '') {
        taskData.dueDate = undefined;
      }
      
      const res = await apiRequest('POST', '/api/tasks', taskData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/task-stats'] });
      toast({
        title: "Task created",
        description: "Your task has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TaskInput> }) => {
      // Convert empty due date strings to undefined
      if (data.dueDate === '') {
        data.dueDate = undefined;
      }
      
      const res = await apiRequest('PATCH', `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/task-stats'] });
      setSelectedTask(null);
      toast({
        title: "Task updated",
        description: "Your task has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tasks/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/task-stats'] });
      toast({
        title: "Task deleted",
        description: "Your task has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Extract tasks mutation with proper typing
  const extractTasksMutation = useMutation<
    { tasks: ExtractedTask[] }, 
    Error, 
    string
  >({
    mutationFn: async (text: string) => {
      // Add a small delay to ensure any previous state updates have processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Make API request to extract tasks
      const res = await apiRequest('POST', '/api/extract-tasks', { text });
      const data = await res.json();
      
      console.log("Extracted tasks:", data);
      return data;
    },
    onSuccess: (data) => {
      // Log success for debugging
      console.log("Task extraction successful:", data);
      return data;
    },
    onError: (error) => {
      console.error("Task extraction error:", error);
      toast({
        title: "Failed to extract tasks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle move task between statuses
  const moveTask = useCallback((taskId: number, newStatus: TaskStatusType) => {
    updateTaskMutation.mutate({ 
      id: taskId, 
      data: { status: newStatus } 
    });
  }, [updateTaskMutation]);

  // Save extracted tasks
  const saveExtractedTasks = useCallback((extractedTasks: ExtractedTask[]) => {
    extractedTasks.forEach(task => {
      const taskInput: TaskInput = {
        ...task,
        status: TaskStatus.TODO,
        isAiGenerated: 1,
        source: 'AI Assistant'
      };
      
      createTaskMutation.mutate(taskInput);
    });
  }, [createTaskMutation]);

  return {
    tasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    aiGeneratedTasks,
    stats,
    isLoading: tasksLoading || statsLoading,
    error: tasksError,
    selectedTask,
    setSelectedTask,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    moveTask,
    extractTasks: extractTasksMutation.mutate,
    extractedTasks: extractTasksMutation.data?.tasks || [],
    isExtracting: extractTasksMutation.isPending,
    saveExtractedTasks,
    isPending: createTaskMutation.isPending || updateTaskMutation.isPending || deleteTaskMutation.isPending
  };
}
