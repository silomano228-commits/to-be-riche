import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    await db.user.count();
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: e.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
