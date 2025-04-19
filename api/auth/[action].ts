import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z, ZodError } from 'zod';
import { db } from '../../lib/db';
import { insertUserSchema, users, eq } from '../../shared/schema';
import { serialize } from 'cookie';
import { getUserIdFromCookies } from '../../lib/auth';

// Session handling for serverless functions
const SESSION_COOKIE = 'session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ai-task-manager-secret';
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

// Helper to set session cookie
const setSessionCookie = (userId: number, username: string) => {
  const sessionData = Buffer.from(JSON.stringify({ userId, username })).toString('base64');
  
  return serialize(SESSION_COOKIE, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_EXPIRY,
    path: '/',
    sameSite: 'lax',
  });
};

// Handler for authentication routes
export async function GET(request: NextRequest, { params }: { params: { action: string } }) {
  const action = params.action;
  
  if (action === 'user') {
    const userId = getUserIdFromCookies(request);
    
    if (!userId) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user data from database
    const [user] = await db.select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, userId));
      
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(user);
  }
  
  return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest, { params }: { params: { action: string } }) {
  const action = params.action;
  
  if (action === 'register') {
    try {
      const body = await request.json();
      const userData = insertUserSchema.parse(body);
      
      // Check if username already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, userData.username));
      
      if (existingUser) {
        return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user with hashed password
      const [user] = await db.insert(users)
        .values({ ...userData, password: hashedPassword })
        .returning({ id: users.id, username: users.username });
      
      // Create response with session cookie
      const response = NextResponse.json(user, { status: 201 });
      response.headers.set('Set-Cookie', setSessionCookie(user.id, user.username));
      
      return response;
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ 
          message: 'Invalid user data', 
          error: error.errors.map(e => e.message).join(', ') 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        message: 'Failed to register user', 
        error: (error as Error).message 
      }, { status: 500 });
    }
  }
  
  if (action === 'login') {
    try {
      const body = await request.json();
      const { username, password } = body;
      
      if (!username || !password) {
        return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
      }
      
      // Find user by username
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (!user) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }
      
      // Create response with session cookie
      const response = NextResponse.json({ 
        id: user.id, 
        username: user.username 
      });
      
      response.headers.set('Set-Cookie', setSessionCookie(user.id, user.username));
      
      return response;
    } catch (error) {
      return NextResponse.json({ 
        message: 'Login failed', 
        error: (error as Error).message 
      }, { status: 500 });
    }
  }
  
  if (action === 'logout') {
    // Clear the session cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.headers.set('Set-Cookie', serialize(SESSION_COOKIE, '', { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    }));
    
    return response;
  }
  
  return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}