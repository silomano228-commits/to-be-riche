import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get all closed/liquidated positions grouped by user
    // We fetch all closed positions and aggregate manually for SQLite compatibility
    const closedPositions = await db.tradingPosition.findMany({
      where: {
        status: { in: ['closed', 'liquidated'] },
      },
      select: {
        userId: true,
        profitLoss: true,
        amount: true,
        result: true,
      },
    });

    // Aggregate per user
    const userMap = new Map<
      string,
      {
        totalProfit: number;
        totalVolume: number;
        totalTrades: number;
        winningTrades: number;
      }
    >();

    for (const pos of closedPositions) {
      const existing = userMap.get(pos.userId) || {
        totalProfit: 0,
        totalVolume: 0,
        totalTrades: 0,
        winningTrades: 0,
      };

      existing.totalProfit += pos.profitLoss || 0;
      existing.totalVolume += pos.amount || 0;
      existing.totalTrades += 1;
      if (pos.result === 'win') {
        existing.winningTrades += 1;
      }

      userMap.set(pos.userId, existing);
    }

    // Sort by totalProfit descending and take top 20
    const sorted = [...userMap.entries()]
      .sort((a, b) => b[1].totalProfit - a[1].totalProfit)
      .slice(0, 20);

    // Get user details
    const leaderboard = await Promise.all(
      sorted.map(async ([userId, stats], index) => {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        });

        const winRate =
          stats.totalTrades > 0
            ? Math.round((stats.winningTrades / stats.totalTrades) * 10000) / 100
            : 0;

        return {
          rank: index + 1,
          userId,
          name: user?.name || 'Unknown',
          email: user?.email || '',
          totalTrades: stats.totalTrades,
          winningTrades: stats.winningTrades,
          winRate,
          totalProfit: Math.round(stats.totalProfit * 100) / 100,
          totalVolume: Math.round(stats.totalVolume * 100) / 100,
        };
      })
    );

    return NextResponse.json({
      success: true,
      leaderboard,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
