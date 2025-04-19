import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '../../lib/db';
import { reports, insertReportSchema, and, gte, lte } from '../../shared/schema';
import { isAuthenticated, getUserIdFromCookies } from '../../lib/auth';

export async function GET(request: NextRequest) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get('startDate');
  const endDateParam = url.searchParams.get('endDate');
  
  try {
    // Filter by date range if provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
      }
      
      const reportsResult = await db.select().from(reports).where(
        and(
          gte(reports.startDate, startDate),
          lte(reports.endDate, endDate)
        )
      );
      
      return NextResponse.json(reportsResult);
    }
    
    // Get all reports (default)
    const reportsResult = await db.select().from(reports);
    return NextResponse.json(reportsResult);
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to fetch reports', 
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
    const reportData = insertReportSchema.parse(body);
    
    // Set userId from session
    reportData.userId = userId;
    
    // Handle date conversion
    const processedData: any = { ...reportData };
    
    if (processedData.startDate && typeof processedData.startDate === 'string') {
      processedData.startDate = new Date(processedData.startDate);
    }
    
    if (processedData.endDate && typeof processedData.endDate === 'string') {
      processedData.endDate = new Date(processedData.endDate);
    }
    
    // Create report
    const [report] = await db.insert(reports).values(processedData).returning();
    
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        message: 'Invalid report data', 
        error: error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Failed to create report', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}