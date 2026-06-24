import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getToken } from '@/lib/trading/helpers';

export const dynamic = 'force-dynamic';

async function getUser(request: Request) {
  return getToken(request);
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(5, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Get closed positions for the user
    const [positions, total] = await Promise.all([
      db.tradingPosition.findMany({
        where: {
          userId: user.id,
          status: { in: ['closed', 'liquidated'] },
        },
        orderBy: { closedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.tradingPosition.count({
        where: {
          userId: user.id,
          status: { in: ['closed', 'liquidated'] },
        },
      }),
    ]);

    // Calculate summary stats
    const totalTrades = total;
    const winCount = positions.filter((p) => p.result === 'win').length;
    const lossCount = positions.filter((p) => p.result === 'loss').length;
    const totalPL = positions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);

    return NextResponse.json({
      success: true,
      positions: positions.map((pos) => ({
        id: pos.id,
        asset: pos.asset,
        direction: pos.direction,
        amount: pos.amount,
        entryPrice: pos.entryPrice,
        closePrice: pos.closePrice,
        profitLoss: pos.profitLoss,
        plPercent: pos.plPercent,
        result: pos.result,
        closeReason: pos.closeReason,
        openedAt: pos.openedAt,
        closedAt: pos.closedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalTrades,
        winCount,
        lossCount,
        totalPL: Math.round(totalPL * 100) / 100,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
