import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO, isToday } from 'date-fns';
import { Task, TaskStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NewTaskDialog from '@/components/NewTaskDialog';
import { useTaskManager } from '@/hooks/useTaskManager';

const CalendarView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  // Get all tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });
  
  const { createTask, isPending } = useTaskManager();

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });
  
  // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
  const startDay = getDay(monthStart);
  
  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.dueDate) {
      // Handle both Date objects and string dates
      const dueDate = task.dueDate instanceof Date 
        ? task.dueDate 
        : new Date(String(task.dueDate));
        
      const dateKey = format(dueDate, 'yyyy-MM-dd');
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);
  
  // Handle previous month
  const prevMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date);
  };
  
  // Handle next month
  const nextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date);
  };
  
  // Open task dialog with pre-filled date
  const openNewTaskForDate = (date: Date) => {
    setSelectedDate(date);
    setIsTaskDialogOpen(true);
  };
  
  // Handle task submission
  const handleTaskSubmit = (taskData: any) => {
    createTask(taskData);
    setIsTaskDialogOpen(false);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar View</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-medium w-36 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        {/* Calendar header - weekdays */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="font-medium text-center py-2 text-sm">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 auto-rows-fr">
          {/* Empty cells for previous month */}
          {Array.from({ length: startDay }).map((_, index) => (
            <div key={`empty-start-${index}`} className="bg-gray-50 rounded-md h-28"></div>
          ))}
          
          {/* Days of current month */}
          {daysInMonth.map((day) => {
            const formattedDate = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[formattedDate] || [];
            const isCurrentDay = isToday(day);
            
            return (
              <div 
                key={formattedDate}
                className={`border rounded-md p-1 h-28 ${isCurrentDay ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${isCurrentDay ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={() => openNewTaskForDate(day)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="mt-1 max-h-[calc(100%-24px)] overflow-y-auto">
                  {dayTasks.slice(0, 3).map((task) => (
                    <TooltipProvider key={task.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={`text-xs mb-1 p-1 rounded-md truncate flex items-center cursor-pointer hover:bg-gray-100 ${
                              task.priority === 'high' ? 'border-l-2 border-red-500' : 
                              task.priority === 'medium' ? 'border-l-2 border-amber-500' : 
                              'border-l-2 border-blue-500'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mr-1 ${getPriorityColor(task.priority)}`}></div>
                            <span className="truncate">{task.title}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <p className="font-semibold">{task.title}</p>
                            {task.description && <p className="text-xs mt-1">{task.description}</p>}
                            <div className="flex items-center mt-1 gap-2">
                              <span className="text-xs">Priority: 
                                <span className={`ml-1 font-medium ${
                                  task.priority === 'high' ? 'text-red-500' : 
                                  task.priority === 'medium' ? 'text-amber-500' : 
                                  'text-blue-500'
                                }`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </span>
                              {task.category && <span className="text-xs">Category: <span className="font-medium">{task.category}</span></span>}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                  
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 mt-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Empty cells for next month */}
          {Array.from({ length: (7 - ((startDay + daysInMonth.length) % 7)) % 7 }).map((_, index) => (
            <div key={`empty-end-${index}`} className="bg-gray-50 rounded-md h-28"></div>
          ))}
        </div>
      </div>
      
      {/* New Task Dialog */}
      {selectedDate && (
        <NewTaskDialog
          isOpen={isTaskDialogOpen}
          onClose={() => setIsTaskDialogOpen(false)}
          onSubmit={handleTaskSubmit}
          editTask={{
            id: 0,
            title: '',
            description: '',
            priority: 'medium',
            dueDate: selectedDate,
            status: TaskStatus.TODO,
            createdAt: new Date()
          }}
          isSubmitting={isPending}
        />
      )}
    </div>
  );
};

export default CalendarView;