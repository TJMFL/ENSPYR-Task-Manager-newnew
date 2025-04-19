import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '../../lib/db';
import { aiMessages, insertAiMessageSchema, desc } from '../../shared/schema';
import { isAuthenticated, getUserIdFromCookies } from '../../lib/auth';

export async function GET(request: NextRequest) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit') as string) : undefined;
  
  try {
    // Build query
    const query = db.select().from(aiMessages).orderBy(desc(aiMessages.timestamp));
    
    // Apply limit if provided
    if (limit) {
      query.limit(limit);
    }
    
    const messages = await query;
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch AI messages', 
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
    const messageData = insertAiMessageSchema.parse(body);
    
    // Set userId from session
    messageData.userId = userId;
    
    // Create AI message
    const [message] = await db.insert(aiMessages).values(messageData).returning();
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        message: 'Invalid message data', 
        error: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Failed to create message', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}