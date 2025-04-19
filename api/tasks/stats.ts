import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { tasks, TaskStatus } from '../../shared/schema';
import { isAuthenticated } from '../../lib/auth';

export async function GET(request: NextRequest) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  try {
    const allTasks = await db.select().from(tasks);
    
    const todoTasks = allTasks.filter(task => task.status === TaskStatus.TODO);
    const inProgressTasks = allTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
    const completedTasks = allTasks.filter(task => task.status === TaskStatus.COMPLETED);
    
    const completionRate = allTasks.length > 0 
      ? Math.round((completedTasks.length / allTasks.length) * 100) 
      : 0;

    return NextResponse.json({
      total: allTasks.length,
      todo: todoTasks.length,
      inProgress: inProgressTasks.length,
      completed: completedTasks.length,
      completionRate
    });
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch task statistics', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}