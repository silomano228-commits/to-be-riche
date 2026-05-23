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
      turso: !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: e.message,
      turso: !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasDbUrl: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
