import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, StopCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Task, TaskInput, TaskStatus } from '@/lib/types';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceStrict } from 'date-fns';

interface TimeTrackerProps {
  task: Task;
  onTimeUpdated?: () => void;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ task, onTimeUpdated }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number>(task.timeSpent || 0); // Total minutes
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { updateTask, isPending } = useTaskManager();
  const { toast } = useToast();

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Format elapsed time
  const formatElapsedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Start tracking time
  const startTimer = () => {
    if (isRunning) return;

    setIsRunning(true);
    startTimeRef.current = Date.now();

    // Update timer display every minute
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsedMinutes = Math.floor((Date.now() - startTimeRef.current) / 60000);
        setElapsedTime((prev: number) => (task.timeSpent || 0) + elapsedMinutes);
      }
    }, 60000); // Update every minute
  };

  // Pause the timer
  const pauseTimer = () => {
    if (!isRunning) return;

    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (startTimeRef.current) {
      const elapsedMinutes = Math.floor((Date.now() - startTimeRef.current) / 60000);
      const newTotalTime = (task.timeSpent || 0) + elapsedMinutes;
      setElapsedTime(newTotalTime);

      // Save the updated time
      updateTaskTime(newTotalTime);
      startTimeRef.current = null;
    }
  };

  // Stop tracking and mark as completed
  const stopAndComplete = async () => {
    pauseTimer();
    
    // Update task status to completed and save the completion time
    try {
      const updatedTask: Partial<TaskInput> = {
        status: TaskStatus.COMPLETED,
        timeCompleted: new Date().toISOString(),
        timeSpent: elapsedTime
      };
      
      await updateTask({ id: task.id, data: updatedTask });
      
      toast({
        title: 'Task Completed',
        description: `You spent ${formatElapsedTime(elapsedTime)} on this task.`,
      });
      
      if (onTimeUpdated) {
        onTimeUpdated();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task completion status.',
        variant: 'destructive',
      });
    }
  };

  // Update task time in the database
  const updateTaskTime = async (minutes: number) => {
    try {
      if (task.timeSpent === minutes) return; // No changes

      const updatedTask: Partial<TaskInput> = {
        timeSpent: minutes
      };
      
      await updateTask({ id: task.id, data: updatedTask });
      
      if (onTimeUpdated) {
        onTimeUpdated();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update time tracking data.',
        variant: 'destructive',
      });
    }
  };

  // Determine if we can start/resume the timer (only for todo or in-progress tasks)
  const canStartTimer = task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS;

  return (
    <div className="flex flex-col space-y-2 p-2 bg-gray-50 rounded-md">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-1" />
          <span>Time Tracked: {formatElapsedTime(elapsedTime)}</span>
        </div>
        
        {task.timeCompleted && (
          <span className="text-xs text-green-600">
            Completed {formatDistanceStrict(new Date(task.timeCompleted), new Date(), { addSuffix: true })}
          </span>
        )}
      </div>
      
      <div className="flex space-x-2">
        {canStartTimer && (
          <>
            {isRunning ? (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1" 
                onClick={pauseTimer}
                disabled={isPending}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1" 
                onClick={startTimer}
                disabled={isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                {task.timeSpent && task.timeSpent > 0 ? 'Resume' : 'Start'}
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 border-green-500 text-green-600 hover:bg-green-50" 
              onClick={stopAndComplete}
              disabled={isPending}
            >
              <StopCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          </>
        )}
        
        {!canStartTimer && task.status === TaskStatus.COMPLETED && (
          <div className="w-full text-center text-sm text-green-600 py-1">
            Task completed
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracker;