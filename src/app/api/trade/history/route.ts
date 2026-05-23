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

    const trades = await db.trade.findMany({
      where: {
        userId: user.id,
        resolved: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'lose').length;
    const draws = trades.filter(t => t.result === 'draw').length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalWagered = trades.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      success: true,
      trades,
      stats: {
        total: trades.length,
        wins,
        losses,
        draws,
        winRate: trades.length > 0 ? Math.round(wins / trades.length * 100) : 0,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalWagered: Math.round(totalWagered * 100) / 100,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
