import React, { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { 
  ClipboardList, 
  Zap, 
  CheckCheck, 
  BarChart, 
  Plus 
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTaskManager } from '@/hooks/useTaskManager';
import { TaskStatus } from '@/lib/types';
import StatCard from '@/components/StatCard';
import TaskColumn from '@/components/TaskColumn';
import NewTaskDialog from '@/components/NewTaskDialog';

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
          title="Total Tasks" 
          value={stats?.total || 0} 
          icon={<ClipboardList className="h-6 w-6" />} 
          iconBgColor="bg-blue-100" 
          iconColor="text-primary" 
        />
        
        <StatCard 
          title="In Progress" 
          value={stats?.inProgress || 0} 
          icon={<Zap className="h-6 w-6" />} 
          iconBgColor="bg-amber-100" 
          iconColor="text-amber-500" 
        />
        
        <StatCard 
          title="Completed" 
          value={stats?.completed || 0} 
          icon={<CheckCheck className="h-6 w-6" />} 
          iconBgColor="bg-green-100" 
          iconColor="text-green-500" 
        />
        
        <StatCard 
          title="Completion Rate" 
          value={`${stats?.completionRate || 0}%`} 
          icon={<BarChart className="h-6 w-6" />} 
          iconBgColor="bg-violet-100" 
          iconColor="text-violet-500" 
        />
      </div>
      
      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Kanban Board (3 cols wide) */}
        <div className="lg:col-span-3">
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
        
        {/* AI Assistant (2 cols wide) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-accent" />
              Recently Added Tasks
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aiGeneratedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                        No recently added tasks. Create a new task or use the AI Assistant!
                      </td>
                    </tr>
                  ) : (
                    aiGeneratedTasks.slice(0, 5).map((task) => (
                      <tr key={task.id} onClick={() => handleTaskClick(task)} className="cursor-pointer hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'Not set'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                              task.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.status === 'todo' ? 'bg-blue-100 text-blue-800' : 
                              task.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 
                              'bg-green-100 text-green-800'}`}>
                            {task.status === 'todo' ? 'To Do' : 
                             task.status === 'in_progress' ? 'In Progress' : 
                             'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
