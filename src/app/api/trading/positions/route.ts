import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSimulatedPrice, calculatePL, getToken } from '@/lib/trading/helpers';

export const dynamic = 'force-dynamic';

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

    // Get all open positions
    const openPositions = await db.tradingPosition.findMany({
      where: {
        userId: user.id,
        status: 'open',
      },
      orderBy: { openedAt: 'desc' },
    });

    // Get recently closed positions (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentClosed = await db.tradingPosition.findMany({
      where: {
        userId: user.id,
        status: { in: ['closed', 'liquidated'] },
        closedAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { closedAt: 'desc' },
    });

    // Calculate current P/L for each open position using simulated current price
    const openWithPL = openPositions.map((pos) => {
      const currentPrice = getSimulatedPrice(pos.asset);
      const { profitLoss, plPercent } = calculatePL(
        pos.direction,
        pos.amount,
        pos.entryPrice,
        currentPrice
      );

      // Check if stop loss / take profit triggered
      let shouldClose = false;
      let closeReason = '';

      if (pos.stopLoss && plPercent <= -pos.stopLoss) {
        shouldClose = true;
        closeReason = 'stop_loss';
      } else if (pos.takeProfit && plPercent >= pos.takeProfit) {
        shouldClose = true;
        closeReason = 'take_profit';
      } else if (profitLoss <= -(pos.amount * 0.9)) {
        shouldClose = true;
        closeReason = 'liquidated';
      }

      return {
        id: pos.id,
        asset: pos.asset,
        direction: pos.direction,
        amount: pos.amount,
        entryPrice: pos.entryPrice,
        currentPrice,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
        profitLoss,
        plPercent,
        status: pos.status,
        openedAt: pos.openedAt,
        shouldClose,
        closeReason,
      };
    });

    // Auto-close positions that hit stop loss / take profit
    const positionsToClose = openWithPL.filter((p) => p.shouldClose);
    for (const pos of positionsToClose) {
      const result: 'win' | 'loss' = pos.profitLoss >= 0 ? 'win' : 'loss';
      const returnAmount = Math.max(0, Math.round((pos.amount + pos.profitLoss) * 100) / 100);

      await db.tradingPosition.update({
        where: { id: pos.id },
        data: {
          status: 'closed',
          closePrice: pos.currentPrice,
          currentPrice: pos.currentPrice,
          closeReason: pos.closeReason,
          result,
          profitLoss: pos.profitLoss,
          plPercent: pos.plPercent,
          closedAt: new Date(),
        },
      });

      await db.user.update({
        where: { id: user.id },
        data: { tradeBalance: { increment: returnAmount } },
      });

      await db.transaction.create({
        data: {
          type: result === 'win' ? 'trading_close_win' : 'trading_close_loss',
          amount: returnAmount,
          detail: `Trading Arena: Auto-closed ${pos.direction} $${pos.amount.toFixed(2)} ${pos.asset} — P/L: $${pos.profitLoss.toFixed(2)} [${pos.closeReason}]`,
          userId: user.id,
        },
      });
    }

    // Filter out auto-closed positions from open list
    const remainingOpen = openWithPL.filter((p) => !p.shouldClose);

    return NextResponse.json({
      success: true,
      openPositions: remainingOpen,
      recentClosed: recentClosed.map((pos) => ({
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
      autoClosedCount: positionsToClose.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
