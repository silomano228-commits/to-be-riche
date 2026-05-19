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
const LOSE_RATE = 65; // 65% chance to lose = 35% win rate (DO NOT expose this in the app)

// Market base prices for realistic entry prices
const MARKET_PRICES: Record<string, { base: number; volatility: number; decimals: number }> = {
  BTC: { base: 67500, volatility: 800, decimals: 2 },
  ETH: { base: 3450, volatility: 120, decimals: 2 },
  EUR: { base: 1.085, volatility: 0.008, decimals: 4 },
  GOLD: { base: 2340, volatility: 35, decimals: 2 },
  AAPL: { base: 192, volatility: 4, decimals: 2 },
  TSLA: { base: 245, volatility: 8, decimals: 2 },
};

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, direction, durationSec, asset } = body;

    if (!amount || !direction || !durationSec) {
      return NextResponse.json({ success: false, error: 'Missing fields: amount, direction, durationSec' }, { status: 400 });
    }

    if (!['up', 'down'].includes(direction)) {
      return NextResponse.json({ success: false, error: 'Direction must be "up" or "down"' }, { status: 400 });
    }

    const tradeAsset = asset || 'BTC';
    const marketInfo = MARKET_PRICES[tradeAsset] || MARKET_PRICES.BTC;

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

    // Generate realistic entry price based on market
    const entryPrice = Math.round((marketInfo.base + (Math.random() - 0.5) * marketInfo.volatility) * Math.pow(10, marketInfo.decimals)) / Math.pow(10, marketInfo.decimals);

    // Determine outcome: 65% lose rate
    const roll = Math.random() * 100;
    let result: 'win' | 'lose' | 'draw';
    let profit: number;
    let exitPrice: number;

    if (roll < LOSE_RATE) {
      // LOSE
      result = 'lose';
      profit = -tradeAmount;
      const change = marketInfo.volatility * (0.1 + Math.random() * 0.4);
      exitPrice = direction === 'up'
        ? Math.round((entryPrice - change) * Math.pow(10, marketInfo.decimals)) / Math.pow(10, marketInfo.decimals)
        : Math.round((entryPrice + change) * Math.pow(10, marketInfo.decimals)) / Math.pow(10, marketInfo.decimals);
    } else if (roll > LOSE_RATE) {
      // WIN
      const profitPercent = 0.5 + Math.random() * 0.35; // 50% to 85% profit
      profit = Math.round(tradeAmount * profitPercent * 100) / 100;
      result = 'win';
      const change = marketInfo.volatility * (0.1 + Math.random() * 0.4);
      exitPrice = direction === 'up'
        ? Math.round((entryPrice + change) * Math.pow(10, marketInfo.decimals)) / Math.pow(10, marketInfo.decimals)
        : Math.round((entryPrice - change) * Math.pow(10, marketInfo.decimals)) / Math.pow(10, marketInfo.decimals);
    } else {
      // DRAW
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
        asset: tradeAsset,
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
        detail: `Trade: $${tradeAmount.toFixed(2)} ${direction.toUpperCase()} ${tradeAsset} for ${duration}s — Entry: $${entryPrice}`,
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
        asset: tradeAsset,
        entryPrice,
        endsAt: trade.endsAt,
      },
      message: `Trade created: $${tradeAmount.toFixed(2)} ${direction.toUpperCase()} ${tradeAsset} for ${duration}s`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
