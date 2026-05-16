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

const MIN_TRADE = 1;
const MAX_TRADE = 5;
const LOSE_RATE = 75; // 75% chance to lose

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, direction, durationSec } = body;

    if (!amount || !direction || !durationSec) {
      return NextResponse.json({ success: false, error: 'Missing fields: amount, direction, durationSec' }, { status: 400 });
    }

    if (!['up', 'down'].includes(direction)) {
      return NextResponse.json({ success: false, error: 'Direction must be "up" or "down"' }, { status: 400 });
    }

    const tradeAmount = Number(amount);
    const duration = Number(durationSec);

    if (isNaN(tradeAmount) || tradeAmount < MIN_TRADE || tradeAmount > MAX_TRADE) {
      return NextResponse.json({ success: false, error: `Trade amount must be between $${MIN_TRADE} and $${MAX_TRADE}` }, { status: 400 });
    }

    if (isNaN(duration) || duration < 60 || duration > 600) {
      return NextResponse.json({ success: false, error: 'Duration must be between 60 and 600 seconds' }, { status: 400 });
    }

    if (user.tradeBalance < tradeAmount) {
      return NextResponse.json({ success: false, error: `Transférez des fonds vers votre Compte de Trading depuis le Portefeuille` }, { status: 400 });
    }

    // Generate random entry price
    const entryPrice = Math.round((50 + Math.random() * 100) * 100) / 100;

    // Determine outcome: 75% lose rate
    const roll = Math.random() * 100;
    let result: 'win' | 'lose' | 'draw';
    let profit: number;
    let exitPrice: number;

    if (roll < LOSE_RATE) {
      // LOSE
      result = 'lose';
      profit = -tradeAmount;
      // Exit price goes against direction
      const change = Math.random() * 5 + 1; // 1-6 point move against
      exitPrice = direction === 'up'
        ? Math.round((entryPrice - change) * 100) / 100
        : Math.round((entryPrice + change) * 100) / 100;
    } else if (roll > LOSE_RATE) {
      // WIN
      const profitPercent = 0.5 + Math.random() * 0.35; // 50% to 85% profit
      profit = Math.round(tradeAmount * profitPercent * 100) / 100;
      result = 'win';
      // Exit price goes in direction
      const change = Math.random() * 5 + 1;
      exitPrice = direction === 'up'
        ? Math.round((entryPrice + change) * 100) / 100
        : Math.round((entryPrice - change) * 100) / 100;
    } else {
      // DRAW (extremely rare, exactly 75.000...)
      result = 'draw';
      profit = 0;
      exitPrice = entryPrice;
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + duration * 1000);

    const trade = await db.trade.create({
      data: {
        userId: user.id,
        amount: tradeAmount,
        direction,
        durationSec: duration,
        result,
        profit,
        entryPrice,
        exitPrice,
        endsAt,
        resolved: false,
      },
    });

    // Deduct from tradeBalance
    await db.user.update({
      where: { id: user.id },
      data: { tradeBalance: { decrement: tradeAmount } },
    });

    // Create transaction
    await db.transaction.create({
      data: {
        type: 'trade_create',
        amount: -tradeAmount,
        detail: `Trade: $${tradeAmount.toFixed(2)} ${direction.toUpperCase()} for ${duration}s — Entry: $${entryPrice}`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      trade: {
        id: trade.id,
        amount: tradeAmount,
        direction,
        durationSec: duration,
        entryPrice,
        endsAt: trade.endsAt,
        // Don't expose result/profit/exitPrice until resolved
      },
      message: `Trade created: $${tradeAmount.toFixed(2)} ${direction.toUpperCase()} for ${duration}s`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
