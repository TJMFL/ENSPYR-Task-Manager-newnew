import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskInput, TaskStatus, ExtractedTask } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useTaskManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch all tasks
  const { 
    data: tasks = [], 
    isLoading: tasksLoading,
    error: tasksError 
  } = useQuery({
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
  const todoTasks = tasks.filter(task => task.status === TaskStatus.TODO);
  const inProgressTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
  const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED);

  // AI-generated tasks
  const aiGeneratedTasks = tasks.filter(task => task.isAiGenerated);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskInput) => {
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

  // Extract tasks mutation
  const extractTasksMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest('POST', '/api/extract-tasks', { text });
      return res.json();
    },
    onError: (error) => {
      toast({
        title: "Failed to extract tasks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle move task between statuses
  const moveTask = useCallback((taskId: number, newStatus: string) => {
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
