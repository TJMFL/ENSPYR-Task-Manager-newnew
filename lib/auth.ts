import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';

// Session handling for serverless functions
const SESSION_COOKIE = 'session';

// Helper to parse cookies from request
export const parseCookies = (request: NextRequest) => {
  const cookieHeader = request.headers.get('cookie');
  return cookieHeader ? parse(cookieHeader) : {};
};

// Helper to get user ID from cookies
export const getUserIdFromCookies = (request: NextRequest): number | null => {
  const cookies = parseCookies(request);
  const sessionData = cookies[SESSION_COOKIE];
  
  if (!sessionData) return null;
  
  try {
    const session = JSON.parse(Buffer.from(sessionData, 'base64').toString());
    return session.userId || null;
  } catch (error) {
    return null;
  }
};

// Authentication middleware for API routes
export const isAuthenticated = async (request: NextRequest) => {
  const userId = getUserIdFromCookies(request);
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  return null; // Authentication passed
};