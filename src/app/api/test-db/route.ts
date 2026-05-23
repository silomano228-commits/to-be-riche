import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Admin auth check
    const token = request.headers.get('x-auth-token') ||
      (request.headers.get('cookie') || '').match(/br_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    const authUser = await db.user.findUnique({ where: { id: token } });
    if (!authUser || authUser.role !== 'admin') return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });

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
