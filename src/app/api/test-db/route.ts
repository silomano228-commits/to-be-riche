import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const client = new PrismaClient();
    const count = await client.user.count();
    await client.$disconnect();
    
    return NextResponse.json({
      status: 'ok',
      userCount: count,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      tursoUrl: process.env.TURSO_DATABASE_URL ? 'SET' : 'NOT SET',
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      error: e.message,
      stack: e.stack?.substring(0, 500),
    }, { status: 500 });
  }
}
