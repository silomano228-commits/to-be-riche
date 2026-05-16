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

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { tradeId } = body;

    if (!tradeId) {
      return NextResponse.json({ success: false, error: 'Trade ID is required' }, { status: 400 });
    }

    const trade = await db.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade || trade.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Trade not found' }, { status: 404 });
    }

    if (trade.resolved) {
      return NextResponse.json({ success: false, error: 'Trade already resolved' }, { status: 400 });
    }

    const now = new Date();
    if (now < trade.endsAt) {
      const remainingSec = Math.ceil((trade.endsAt.getTime() - now.getTime()) / 1000);
      return NextResponse.json({
        success: false,
        error: `Trade not finished yet. ${remainingSec}s remaining.`,
      }, { status: 400 });
    }

    // Resolve the trade
    if (trade.result === 'win') {
      const totalReturn = trade.amount + (trade.profit || 0);
      await db.$transaction([
        db.trade.update({
          where: { id: tradeId },
          data: { resolved: true },
        }),
        db.user.update({
          where: { id: user.id },
          data: {
            investBalance: { increment: totalReturn },
            totalProfit: { increment: trade.profit || 0 },
          },
        }),
        db.transaction.create({
          data: {
            type: 'trade_win',
            amount: totalReturn,
            detail: `Trade WIN: $${trade.amount.toFixed(2)} + $${(trade.profit || 0).toFixed(2)} profit — ${trade.direction.toUpperCase()} @ $${trade.entryPrice} → $${trade.exitPrice}`,
            userId: user.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        result: 'win',
        profit: trade.profit,
        totalReturn,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        message: `You won! +$${(trade.profit || 0).toFixed(2)} profit. Total returned: $${totalReturn.toFixed(2)}`,
      });
    } else if (trade.result === 'lose') {
      await db.$transaction([
        db.trade.update({
          where: { id: tradeId },
          data: { resolved: true },
        }),
        db.user.update({
          where: { id: user.id },
          data: {
            totalLoss: { increment: trade.amount },
          },
        }),
        db.transaction.create({
          data: {
            type: 'trade_lose',
            amount: -trade.amount,
            detail: `Trade LOST: -$${trade.amount.toFixed(2)} — ${trade.direction.toUpperCase()} @ $${trade.entryPrice} → $${trade.exitPrice}`,
            userId: user.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        result: 'lose',
        profit: trade.profit,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        message: `You lost. -$${trade.amount.toFixed(2)}`,
      });
    } else {
      // Draw — return amount to investBalance
      await db.$transaction([
        db.trade.update({
          where: { id: tradeId },
          data: { resolved: true },
        }),
        db.user.update({
          where: { id: user.id },
          data: {
            investBalance: { increment: trade.amount },
          },
        }),
        db.transaction.create({
          data: {
            type: 'trade_draw',
            amount: trade.amount,
            detail: `Trade DRAW: $${trade.amount.toFixed(2)} returned — ${trade.direction.toUpperCase()} @ $${trade.entryPrice}`,
            userId: user.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        result: 'draw',
        profit: 0,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        message: `It's a draw! $${trade.amount.toFixed(2)} returned.`,
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
