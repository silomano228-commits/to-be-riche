import { db } from '@/lib/db';
import { checkAdmin } from '@/app/api/admin/data/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/broadcasts
// Returns the most recent BroadcastMessage records (last 50, newest first)
// so the admin UI can show a history of past broadcasts.
export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const broadcasts = await db.broadcastMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      broadcasts,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
