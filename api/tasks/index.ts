import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '../../lib/db';
import { tasks, insertTaskSchema, TaskStatus, eq, and, gte, lte } from '../../shared/schema';
import { isAuthenticated, getUserIdFromCookies } from '../../lib/auth';

export async function GET(request: NextRequest) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  const userId = getUserIdFromCookies(request);
  const url = new URL(request.url);
  
  // Handle specific query parameters for filtered tasks
  const statusParam = url.searchParams.get('status');
  const locationIdParam = url.searchParams.get('locationId');
  const dueTodayParam = url.searchParams.get('dueToday');
  
  try {
    // Get tasks by status
    if (statusParam) {
      const tasksResult = await db.select().from(tasks).where(eq(tasks.status, statusParam));
      return NextResponse.json(tasksResult);
    }
    
    // Get tasks by location
    if (locationIdParam) {
      const locationId = parseInt(locationIdParam);
      if (isNaN(locationId)) {
        return NextResponse.json({ message: 'Invalid location ID' }, { status: 400 });
      }
      
      const tasksResult = await db.select().from(tasks).where(eq(tasks.locationId, locationId));
      return NextResponse.json(tasksResult);
    }
    
    // Get tasks due today
    if (dueTodayParam === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const tasksResult = await db.select().from(tasks).where(
        and(
          gte(tasks.dueDate, today),
          lte(tasks.dueDate, tomorrow)
        )
      );
      
      return NextResponse.json(tasksResult);
    }
    
    // Get all tasks (default)
    const tasksResult = await db.select().from(tasks);
    return NextResponse.json(tasksResult);
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch tasks', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  const userId = getUserIdFromCookies(request);
  
  try {
    const body = await request.json();
    const taskData = insertTaskSchema.parse(body);
    
    // Set userId from session
    taskData.userId = userId;
    
    // Create task
    const [task] = await db.insert(tasks).values(taskData).returning();
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        message: 'Invalid task data', 
        error: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Failed to create task', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}