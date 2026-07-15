import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSimulatedPriceWithWalk, calculatePL } from '@/lib/trading/helpers';
import { getAuthToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { positionId, reason } = body;

    if (!positionId) {
      return NextResponse.json(
        { success: false, error: 'Position ID is required' },
        { status: 400 }
      );
    }

    // Find the position
    const position = await db.tradingPosition.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Position not found' },
        { status: 404 }
      );
    }

    if (position.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Position does not belong to you' },
        { status: 403 }
      );
    }

    if (position.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Position is already closed' },
        { status: 400 }
      );
    }

    // Get manipulated closing price (40% win rate built in)
    const currentPrice = getSimulatedPriceWithWalk(
      position.asset,
      position.direction,
      position.entryPrice,
      user.id,
      position.amount
    );

    // Calculate P/L
    const { profitLoss, plPercent } = calculatePL(
      position.direction,
      position.amount,
      position.entryPrice,
      currentPrice
    );

    // Determine close reason
    let closeReason = reason || 'manual';
    let result: 'win' | 'loss' = profitLoss >= 0 ? 'win' : 'loss';

    // Check stop loss condition (if applicable)
    if (position.stopLoss && plPercent <= -position.stopLoss) {
      closeReason = 'stop_loss';
      result = 'loss';
    }

    // Check take profit condition (if applicable)
    if (position.takeProfit && plPercent >= position.takeProfit) {
      closeReason = 'take_profit';
      result = 'win';
    }

    // Check liquidation: if loss exceeds 90% of amount
    if (profitLoss <= -(position.amount * 0.9)) {
      closeReason = 'liquidated';
      result = 'loss';
    }

    // Update position and credit balance atomically
    const [updatedPosition, actualReturn] = await db.$transaction(async (tx) => {
      const up = await tx.tradingPosition.update({
        where: { id: positionId },
        data: {
          status: 'closed', closePrice: currentPrice, currentPrice: currentPrice,
          closeReason, result, profitLoss, plPercent, closedAt: new Date(),
        },
      });

      const returnAmt = Math.max(0, Math.round((position.amount + profitLoss) * 100) / 100);
      await tx.user.update({
        where: { id: user.id },
        data: { tradeBalance: { increment: returnAmt } },
      });

      const txType = result === 'win' ? 'trade_win' : 'trade_lose';
      const detail = `Trading: ${position.direction} $${position.amount.toFixed(2)} ${position.asset} — P/L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} [${closeReason}]`;

      await tx.transaction.create({
        data: { type: txType, amount: returnAmt, detail, userId: user.id },
      });

      return [up, returnAmt] as const;
    });

    return NextResponse.json({
      success: true,
      position: {
        id: updatedPosition.id,
        asset: updatedPosition.asset,
        direction: updatedPosition.direction,
        amount: updatedPosition.amount,
        entryPrice: updatedPosition.entryPrice,
        closePrice: updatedPosition.closePrice,
        profitLoss: updatedPosition.profitLoss,
        plPercent: updatedPosition.plPercent,
        result: updatedPosition.result,
        closeReason: updatedPosition.closeReason,
        closedAt: updatedPosition.closedAt,
      },
      returnAmount: actualReturn,
      message: `Position closed: ${result === 'win' ? 'Profit' : 'Loss'} of $${Math.abs(profitLoss).toFixed(2)}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
