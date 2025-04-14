import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Task, TaskPriority } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Edit, Trash2, Clock, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimeTracker from './TimeTracker';
import PhotoUpload from './PhotoUpload';
import { Separator } from '@/components/ui/separator';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  className?: string;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDelete, className, isDragging }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Get border color based on priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'border-red-500';
      case TaskPriority.MEDIUM:
        return 'border-amber-500';
      case TaskPriority.LOW:
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  // Get badge styles based on priority
  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'bg-red-100 text-red-700';
      case TaskPriority.MEDIUM:
        return 'bg-amber-100 text-amber-700';
      case TaskPriority.LOW:
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Format the task due date
  const formattedDueDate = task.dueDate 
    ? format(new Date(task.dueDate), 'E, MMM d')  // Adds day of week (Mon, Tue, etc.)
    : '';

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(task);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task);
  };

  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  const handleTimeUpdated = () => {
    // This will be called when time tracking is updated
    // We could refresh data here, but the useTaskManager hook already handles cache invalidation
  };

  const handlePhotoUploaded = () => {
    // This will be called when a photo is uploaded or removed
    // We could refresh data here, but the useTaskManager hook already handles cache invalidation
  };

  return (
    <Card 
      className={cn(
        'border-l-4 mb-3 bg-gray-800 text-white', // Added dark background and white text
        getPriorityColor(task.priority),
        {
          'opacity-50': isDragging,
          'cursor-grabbing': isDragging
        },
        className
      )}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h4 className={cn(
            "font-medium", 
            task.status === 'completed' && "line-through text-gray-500"
          )}>
            {task.title}
          </h4>
          <Badge 
            variant="outline" 
            className={cn("text-xs", getPriorityBadgeStyles(task.priority))}
          >
            {task.priority === TaskPriority.HIGH ? 'High' : 
             task.priority === TaskPriority.MEDIUM ? 'Medium' : 'Low'}
          </Badge>
        </div>

        {task.description && (
          <p className={cn(
            "text-sm text-gray-600 mb-3", 
            task.status === 'completed' && "text-gray-400"
          )}>
            {task.description}
          </p>
        )}

        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
          <div>
            <span>{formattedDueDate}</span>
            {task.category && <span className="ml-2">{task.category}</span>}
            {task.locationId && <span className="ml-2">📍 Location</span>}
          </div>

          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:text-gray-200" // Added hover effect
              onClick={toggleDetails}
            >
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:text-gray-200" // Added hover effect
              onClick={handleEdit}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Show time tracking and photo upload features when expanded */}
        {showDetails && (
          <div className="mt-2 space-y-3">
            <Separator />
            <TimeTracker task={task} onTimeUpdated={handleTimeUpdated} />
            <Separator />
            <PhotoUpload task={task} onPhotoUploaded={handlePhotoUploaded} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;