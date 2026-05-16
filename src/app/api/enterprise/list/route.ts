import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const enterprises = await db.enterprise.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const enterprisesWithStatus = enterprises.map((ent) => {
      const isFinished = now >= ent.finishesAt;
      const daysElapsed = Math.min(
        ent.durationDays,
        Math.floor((now.getTime() - new Date(ent.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      );
      const daysRemaining = Math.max(0, ent.durationDays - daysElapsed);
      const canClaim = ent.status === 'active' && isFinished;
      const potentialReturn = ent.status === 'active'
        ? Math.round(ent.amount * (ent.minReturn + ent.maxReturn) / 2 / 100 * 100) / 100
        : 0;

      return {
        ...ent,
        isFinished,
        daysElapsed,
        daysRemaining,
        canClaim,
        potentialReturn,
        progressPercent: Math.min(100, Math.round(daysElapsed / ent.durationDays * 100)),
      };
    });

    const active = enterprisesWithStatus.filter((e) => e.status === 'active');
    const completed = enterprisesWithStatus.filter((e) => e.status === 'completed');
    const crashed = enterprisesWithStatus.filter((e) => e.status === 'crashed');
    const totalInvested = enterprises.reduce((sum, e) => sum + e.amount, 0);
    const totalLost = crashed.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      success: true,
      enterprises: enterprisesWithStatus,
      summary: {
        total: enterprises.length,
        active: active.length,
        completed: completed.length,
        crashed: crashed.length,
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalLost: Math.round(totalLost * 100) / 100,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
