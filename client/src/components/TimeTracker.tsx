import React, { useState } from 'react';
import { Clock, Save, CalendarCheck, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task, TaskInput, TaskStatus } from '@/lib/types';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceStrict, parseISO } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface TimeTrackerProps {
  task: Task;
  onTimeUpdated?: () => void;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ task, onTimeUpdated }) => {
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const { updateTask, isPending } = useTaskManager();
  const { toast } = useToast();

  // Format time for display
  const formatTimeDisplay = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  };

  // Toggle time entry form
  const toggleTimeForm = () => {
    setIsAddingTime(!isAddingTime);
  };

  // Log time for the task
  const handleLogTime = async () => {
    try {
      // Validate inputs
      if (!date || !hours || !minutes) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in date, hours, and minutes.',
          variant: 'destructive',
        });
        return;
      }

      const hoursNum = parseInt(hours, 10);
      const minutesNum = parseInt(minutes, 10);
      
      if (isNaN(hoursNum) || isNaN(minutesNum)) {
        toast({
          title: 'Invalid Input',
          description: 'Hours and minutes must be numbers.',
          variant: 'destructive',
        });
        return;
      }
      
      // Calculate total minutes
      const totalMinutes = (hoursNum * 60) + minutesNum;
      
      if (totalMinutes <= 0) {
        toast({
          title: 'Invalid Time',
          description: 'Total time must be greater than 0.',
          variant: 'destructive',
        });
        return;
      }
      
      // Add to existing time spent or start fresh
      const newTotalMinutes = (task.timeSpent || 0) + totalMinutes;
      
      // Update task with the new time information
      const updatedTask: Partial<TaskInput> = {
        timeSpent: newTotalMinutes,
        timeStarted: task.timeStarted || date + 'T00:00:00Z'
      };
      
      await updateTask({ id: task.id, data: updatedTask });
      
      toast({
        title: 'Time Logged',
        description: `Added ${hoursNum}h ${minutesNum}m to the task.`,
      });
      
      // Reset form
      setIsAddingTime(false);
      setHours('');
      setMinutes('');
      
      if (onTimeUpdated) {
        onTimeUpdated();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log time for this task.',
        variant: 'destructive',
      });
    }
  };

  // Mark task as completed
  const markAsCompleted = async () => {
    try {
      const completionDate = new Date().toISOString();
      
      const updatedTask: Partial<TaskInput> = {
        status: TaskStatus.COMPLETED,
        timeCompleted: completionDate
      };
      
      await updateTask({ id: task.id, data: updatedTask });
      
      toast({
        title: 'Task Completed',
        description: 'Task has been marked as completed.',
      });
      
      if (onTimeUpdated) {
        onTimeUpdated();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark task as completed.',
        variant: 'destructive',
      });
    }
  };

  // Determine if we can add time (not for completed tasks)
  const canAddTime = task.status !== TaskStatus.COMPLETED;

  return (
    <div className="flex flex-col space-y-2 p-2 bg-gray-50 rounded-md">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-1" />
          <span>Time Logged: {task.timeSpent ? formatTimeDisplay(task.timeSpent) : 'None'}</span>
        </div>
        
        {task.timeCompleted && (
          <span className="text-xs text-green-600">
            Completed {formatDistanceStrict(new Date(task.timeCompleted), new Date(), { addSuffix: true })}
          </span>
        )}
        
        {task.timeStarted && !task.timeCompleted && (
          <span className="text-xs text-blue-600">
            Started {formatDistanceStrict(parseISO(task.timeStarted), new Date(), { addSuffix: true })}
          </span>
        )}
      </div>
      
      {isAddingTime ? (
        <Card className="p-3 mt-2 border border-gray-200">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input 
                type="date" 
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="hours" className="text-xs">Hours</Label>
                <Input 
                  type="number" 
                  id="hours"
                  min="0" 
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="h-8"
                />
              </div>
              
              <div className="flex flex-col space-y-1">
                <Label htmlFor="minutes" className="text-xs">Minutes</Label>
                <Input 
                  type="number" 
                  id="minutes"
                  min="0" 
                  max="59" 
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
            
            <div className="flex space-x-2 mt-2">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleLogTime}
                disabled={isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Time
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={toggleTimeForm}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex space-x-2">
          {canAddTime && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1" 
              onClick={toggleTimeForm}
              disabled={isPending}
            >
              <CalendarPlus className="h-4 w-4 mr-1" />
              Log Time
            </Button>
          )}
          
          {canAddTime && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 border-green-500 text-green-600 hover:bg-green-50" 
              onClick={markAsCompleted}
              disabled={isPending}
            >
              <CalendarCheck className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
          
          {!canAddTime && (
            <div className="w-full text-center text-sm text-green-600 py-1">
              Task completed
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeTracker;