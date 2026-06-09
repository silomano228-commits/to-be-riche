import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSimulatedPriceWithWalk, calculatePL, getToken } from '@/lib/trading/helpers';

export const dynamic = 'force-dynamic';

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
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

    // Update the position
    const updatedPosition = await db.tradingPosition.update({
      where: { id: positionId },
      data: {
        status: 'closed',
        closePrice: currentPrice,
        currentPrice: currentPrice,
        closeReason,
        result,
        profitLoss,
        plPercent,
        closedAt: new Date(),
      },
    });

    // Credit user tradeBalance: amount + profit (or deduct loss)
    const returnAmount = position.amount + profitLoss;
    // Ensure we don't return negative (in case of liquidation or huge loss)
    const actualReturn = Math.max(0, Math.round(returnAmount * 100) / 100);

    await db.user.update({
      where: { id: user.id },
      data: { tradeBalance: { increment: actualReturn } },
    });

    // Create transaction record
    const txType = result === 'win' ? 'trade_win' : 'trade_lose';
    const detail = `Trading: ${position.direction} $${position.amount.toFixed(2)} ${position.asset} — P/L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} [${closeReason}]`;

    await db.transaction.create({
      data: {
        type: txType,
        amount: actualReturn,
        detail,
        userId: user.id,
      },
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
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
