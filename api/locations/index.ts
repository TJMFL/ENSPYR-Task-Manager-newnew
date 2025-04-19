import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '../../lib/db';
import { locations, insertLocationSchema, eq } from '../../shared/schema';
import { isAuthenticated, getUserIdFromCookies } from '../../lib/auth';

export async function GET(request: NextRequest) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type');
  
  try {
    // Filter by type if provided
    if (typeParam) {
      const locationsResult = await db.select().from(locations).where(eq(locations.type, typeParam));
      return NextResponse.json(locationsResult);
    }
    
    // Get all locations (default)
    const locationsResult = await db.select().from(locations);
    return NextResponse.json(locationsResult);
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch locations', 
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
    const locationData = insertLocationSchema.parse(body);
    
    // Set userId from session
    locationData.userId = userId;
    
    // Create location
    const [location] = await db.insert(locations).values(locationData).returning();
    
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        message: 'Invalid location data', 
        error: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Failed to create location', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}