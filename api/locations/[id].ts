import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '../../lib/db';
import { locations, insertLocationSchema, eq } from '../../shared/schema';
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
      return NextResponse.json({ message: 'Invalid location ID' }, { status: 400 });
    }

    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    
    if (!location) {
      return NextResponse.json({ message: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch location', 
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
      return NextResponse.json({ message: 'Invalid location ID' }, { status: 400 });
    }

    const body = await request.json();
    
    // Validate the update data
    const validData = insertLocationSchema.partial().parse(body);
    
    // Update location
    const [updatedLocation] = await db
      .update(locations)
      .set(validData)
      .where(eq(locations.id, id))
      .returning();
    
    if (!updatedLocation) {
      return NextResponse.json({ message: 'Location not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedLocation);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        message: 'Invalid location data', 
        error: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Failed to update location', 
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
      return NextResponse.json({ message: 'Invalid location ID' }, { status: 400 });
    }

    const result = await db.delete(locations).where(eq(locations.id, id));
    
    if (!result) {
      return NextResponse.json({ message: 'Location not found' }, { status: 404 });
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to delete location', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}