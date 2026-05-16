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

    const activeTrades = await db.trade.findMany({
      where: {
        userId: user.id,
        resolved: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const tradesWithStatus = activeTrades.map((trade) => {
      const timeRemaining = Math.max(0, trade.endsAt.getTime() - now.getTime());
      const canResolve = now >= trade.endsAt;

      return {
        id: trade.id,
        amount: trade.amount,
        direction: trade.direction,
        durationSec: trade.durationSec,
        entryPrice: trade.entryPrice,
        endsAt: trade.endsAt,
        timeRemainingMs: timeRemaining,
        canResolve,
        createdAt: trade.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      trades: tradesWithStatus,
      count: tradesWithStatus.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
