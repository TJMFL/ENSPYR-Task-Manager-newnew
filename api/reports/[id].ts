import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { reports, eq } from '../../shared/schema';
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
      return NextResponse.json({ message: 'Invalid report ID' }, { status: 400 });
    }

    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    
    if (!report) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch report', 
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
      return NextResponse.json({ message: 'Invalid report ID' }, { status: 400 });
    }

    const result = await db.delete(reports).where(eq(reports.id, id));
    
    if (!result) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to delete report', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}