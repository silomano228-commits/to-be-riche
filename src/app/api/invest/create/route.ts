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

const INVESTMENT_LEVELS: Record<number, {
  minAmount: number; maxAmount: number; totalCycles: number; rate: number; label: string;
}> = {
  1: { minAmount: 2, maxAmount: 5, totalCycles: 35, rate: 5, label: 'Level 1 — Starter' },
  2: { minAmount: 5.5, maxAmount: 10, totalCycles: 25, rate: 7.5, label: 'Level 2 — Growth' },
  3: { minAmount: 10.5, maxAmount: 20, totalCycles: 20, rate: 9.5, label: 'Level 3 — Premium' },
  4: { minAmount: 20.5, maxAmount: 50, totalCycles: 20, rate: 12.5, label: 'Level 4 — Elite' },
};

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { level } = body;

    if (!level || ![1, 2, 3, 4].includes(level)) {
      return NextResponse.json({ success: false, error: 'Invalid level. Must be 1-4.' }, { status: 400 });
    }

    const config = INVESTMENT_LEVELS[level];

    // Random amount within the level range
    const amount = Math.round((config.minAmount + Math.random() * (config.maxAmount - config.minAmount)) * 100) / 100;

    if (user.investBalance < amount) {
      return NextResponse.json({ success: false, error: `Insufficient invest balance. Need $${amount.toFixed(2)}, have $${user.investBalance.toFixed(2)}` }, { status: 400 });
    }

    const now = new Date();
    const nextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const finishesAt = new Date(now.getTime() + config.totalCycles * 24 * 60 * 60 * 1000);

    const investment = await db.investment.create({
      data: {
        userId: user.id,
        level,
        amount,
        rate: config.rate,
        totalCycles: config.totalCycles,
        doneCycles: 0,
        earned: 0,
        status: 'active',
        nextClaimAt,
        finishesAt,
      },
    });

    // Deduct from investBalance
    await db.user.update({
      where: { id: user.id },
      data: { investBalance: { decrement: amount } },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        type: 'invest_create',
        amount: -amount,
        detail: `Investment created: ${config.label} — $${amount.toFixed(2)} at ${config.rate}%/cycle for ${config.totalCycles} cycles`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      investment,
      message: `Investment created: $${amount.toFixed(2)} at ${config.rate}%/cycle for ${config.totalCycles} cycles`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
