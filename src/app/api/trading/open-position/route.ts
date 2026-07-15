import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import {
  BASE_PRICES,
  VALID_ASSETS,
  MIN_TRADE_AMOUNT,
  MIN_BALANCE_TO_ACCESS,
  getSimulatedPrice,
} from '@/lib/trading/helpers';
import { getAuthToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { asset, direction, amount, stopLoss, takeProfit } = body;

    // Validate asset
    if (!asset || !VALID_ASSETS.includes(asset)) {
      return NextResponse.json(
        { success: false, error: `Invalid asset. Valid assets: ${VALID_ASSETS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate direction
    if (!direction || !['BUY', 'SELL'].includes(direction)) {
      return NextResponse.json(
        { success: false, error: 'Direction must be BUY or SELL' },
        { status: 400 }
      );
    }

    // Validate amount
    const tradeAmount = Number(amount);
    if (isNaN(tradeAmount) || tradeAmount < MIN_TRADE_AMOUNT) {
      return NextResponse.json(
        { success: false, error: `Minimum trade amount is $${MIN_TRADE_AMOUNT}` },
        { status: 400 }
      );
    }

    // Check minimum balance to access Trading Arena
    if (user.tradeBalance < MIN_BALANCE_TO_ACCESS) {
      return NextResponse.json(
        { success: false, error: `Minimum balance of $${MIN_BALANCE_TO_ACCESS} required to access Trading Arena` },
        { status: 400 }
      );
    }

    // Check sufficient balance (re-read fresh to prevent race)
    const freshUser = await db.user.findUnique({ where: { id: user.id }, select: { tradeBalance: true } });
    if (!freshUser || freshUser.tradeBalance < tradeAmount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient trading balance. Transfer funds from your Wallet.' },
        { status: 400 }
      );
    }

    // Validate stop loss / take profit if provided
    const sl = stopLoss != null ? Number(stopLoss) : null;
    const tp = takeProfit != null ? Number(takeProfit) : null;

    if (sl !== null && (isNaN(sl) || sl <= 0 || sl > 50)) {
      return NextResponse.json(
        { success: false, error: 'Stop loss must be between 0.1% and 50%' },
        { status: 400 }
      );
    }

    if (tp !== null && (isNaN(tp) || tp <= 0 || tp > 200)) {
      return NextResponse.json(
        { success: false, error: 'Take profit must be between 0.1% and 200%' },
        { status: 400 }
      );
    }

    // Generate simulated entry price
    const entryPrice = getSimulatedPrice(asset);

    // Atomic: create position + deduct balance
    const position = await db.$transaction(async (tx) => {
      const p = await tx.tradingPosition.create({
        data: {
          userId: user.id, asset, direction, amount: tradeAmount,
          entryPrice, currentPrice: entryPrice, stopLoss: sl, takeProfit: tp,
          profitLoss: 0, plPercent: 0, status: 'open',
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { tradeBalance: { decrement: tradeAmount } },
      });

      await tx.transaction.create({
        data: {
          type: 'trading_open', amount: -tradeAmount,
          detail: `Trading Arena: ${direction} $${tradeAmount.toFixed(2)} ${asset} @ ${entryPrice}`,
          userId: user.id,
        },
      });

      return p;
    });

    return NextResponse.json({
      success: true,
      position: {
        id: position.id,
        asset: position.asset,
        direction: position.direction,
        amount: position.amount,
        entryPrice: position.entryPrice,
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        status: position.status,
        openedAt: position.openedAt,
      },
      message: `Position opened: ${direction} $${tradeAmount.toFixed(2)} ${asset} @ ${entryPrice}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
