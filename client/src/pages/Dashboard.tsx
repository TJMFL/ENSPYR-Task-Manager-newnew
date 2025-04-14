import React, { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { 
  ClipboardList, 
  Zap, 
  Clock, 
  CalendarClock, 
  Plus,
  CheckCheck,
  BarChart
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTaskManager } from '@/hooks/useTaskManager';
import { TaskStatus, TaskStats, Task } from '@/lib/types';
import StatCard from '@/components/StatCard';
import TaskColumn from '@/components/TaskColumn';
import NewTaskDialog from '@/components/NewTaskDialog';
import DashboardAIAssistant from '@/components/DashboardAIAssistant';

const Dashboard: React.FC = () => {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  const { 
    todoTasks,
    inProgressTasks,
    completedTasks,
    aiGeneratedTasks,
    stats,
    isLoading,
    selectedTask,
    setSelectedTask,
    createTask,
    updateTask,
    moveTask,
    isPending
  } = useTaskManager();

  // Handle task dialog open/close
  const openTaskDialog = () => setIsTaskDialogOpen(true);
  const closeTaskDialog = () => {
    setIsTaskDialogOpen(false);
    setSelectedTask(null);
  };

  // Handle task click to edit
  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  // Handle form submission for creating/updating tasks
  const handleTaskSubmit = (data: any) => {
    if (selectedTask) {
      updateTask({ id: selectedTask.id, data });
    } else {
      createTask({ ...data, status: TaskStatus.TODO });
    }
    closeTaskDialog();
  };

  // Calculate hours worked this week
  const calculateHoursThisWeek = () => {
    if (!completedTasks?.length) return '0';
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start week on Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    // Filter tasks completed this week
    const tasksThisWeek = completedTasks.filter(task => {
      if (!task.timeCompleted) return false;
      const completedDate = new Date(task.timeCompleted);
      return isWithinInterval(completedDate, { start: weekStart, end: weekEnd });
    });
    
    // Sum up hours
    const totalMinutes = tasksThisWeek.reduce((total, task) => total + (task.timeSpent || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}${minutes > 0 ? '.' + Math.round((minutes / 60) * 10) : ''}`;
  };
  
  // Calculate hours worked this month
  const calculateHoursThisMonth = () => {
    if (!completedTasks?.length) return '0';
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Filter tasks completed this month
    const tasksThisMonth = completedTasks.filter(task => {
      if (!task.timeCompleted) return false;
      const completedDate = new Date(task.timeCompleted);
      return isWithinInterval(completedDate, { start: monthStart, end: monthEnd });
    });
    
    // Sum up hours
    const totalMinutes = tasksThisMonth.reduce((total, task) => total + (task.timeSpent || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}${minutes > 0 ? '.' + Math.round((minutes / 60) * 10) : ''}`;
  };

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // Return if dropped outside a droppable area or in the same position
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    const taskId = parseInt(draggableId);
    let newStatus;
    
    // Determine the new status based on the destination
    switch (destination.droppableId) {
      case 'todo':
        newStatus = TaskStatus.TODO;
        break;
      case 'in-progress':
        newStatus = TaskStatus.IN_PROGRESS;
        break;
      case 'completed':
        newStatus = TaskStatus.COMPLETED;
        break;
      default:
        return;
    }
    
    // Update the task's status
    moveTask(taskId, newStatus);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-2 md:mb-0">Dashboard</h1>
        <Button onClick={openTaskDialog} className="bg-primary hover:bg-blue-600">
          <Plus className="h-5 w-5 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="To-Do Tasks" 
          value={stats ? stats.todo : 0} 
          icon={<ClipboardList className="h-6 w-6" />} 
          iconBgColor="bg-blue-100" 
          iconColor="text-primary" 
        />
        
        <StatCard 
          title="In Progress" 
          value={stats ? stats.inProgress : 0} 
          icon={<Zap className="h-6 w-6" />} 
          iconBgColor="bg-amber-100" 
          iconColor="text-amber-500" 
        />
        
        <StatCard 
          title="Hours This Week" 
          value={calculateHoursThisWeek()} 
          icon={<Clock className="h-6 w-6" />} 
          iconBgColor="bg-green-100" 
          iconColor="text-green-500" 
        />
        
        <StatCard 
          title="Hours This Month" 
          value={calculateHoursThisMonth()} 
          icon={<CalendarClock className="h-6 w-6" />} 
          iconBgColor="bg-violet-100" 
          iconColor="text-violet-500" 
        />
      </div>
      
      {/* Main Content Sections - Vertical Layout */}
      <div className="flex flex-col space-y-6">
        {/* Kanban Board (Full Width) */}
        <div className="w-full">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-4">Tasks</h2>
            
            {/* Kanban Board */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TaskColumn 
                  id="todo" 
                  title="To Do" 
                  tasks={todoTasks} 
                  colorIndicator="bg-blue-500" 
                  onTaskClick={handleTaskClick} 
                />
                
                <TaskColumn 
                  id="in-progress" 
                  title="In Progress" 
                  tasks={inProgressTasks} 
                  colorIndicator="bg-amber-500" 
                  onTaskClick={handleTaskClick} 
                />
                
                <TaskColumn 
                  id="completed" 
                  title="Completed" 
                  tasks={completedTasks} 
                  colorIndicator="bg-green-500" 
                  onTaskClick={handleTaskClick} 
                />
              </div>
            </DragDropContext>
          </div>
        </div>
        
        {/* AI Assistant (Full Width) */}
        <div className="w-full">
          <DashboardAIAssistant onTasksAdded={() => {}} />
        </div>
      </div>

      {/* Task Dialog */}
      <NewTaskDialog 
        isOpen={isTaskDialogOpen} 
        onClose={closeTaskDialog} 
        onSubmit={handleTaskSubmit}
        editTask={selectedTask}
        isSubmitting={isPending}
      />
    </div>
  );
};

export default Dashboard;
