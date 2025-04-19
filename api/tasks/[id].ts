import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '../../lib/db';
import { tasks, insertTaskSchema, eq } from '../../shared/schema';
import { isAuthenticated } from '../../lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 });
    }

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    
    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch task', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json();
    
    // Validate the update data
    const validData = insertTaskSchema.partial().parse(body);
    
    // Update task
    const [updatedTask] = await db
      .update(tasks)
      .set(validData)
      .where(eq(tasks.id, id))
      .returning();
    
    if (!updatedTask) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        message: 'Invalid task data', 
        error: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Failed to update task', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 });
    }

    const result = await db.delete(tasks).where(eq(tasks.id, id));
    
    if (!result) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to delete task', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}