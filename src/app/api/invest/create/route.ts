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
  minAmount: number; maxAmount: number; totalCycles: number; rate: number;
  label: string; requiredReferrals: number; unlockFee: number;
  totalReturn: number; profit: number;
}> = {
  1: { minAmount: 5, maxAmount: 10, totalCycles: 15, rate: 3.33, label: 'Niveau 1 — Micro', requiredReferrals: 0, unlockFee: 0, totalReturn: 150, profit: 50 },
  2: { minAmount: 10.5, maxAmount: 25, totalCycles: 15, rate: 4.67, label: 'Niveau 2 — Standard', requiredReferrals: 2, unlockFee: 5, totalReturn: 170, profit: 70 },
  3: { minAmount: 25.5, maxAmount: 60, totalCycles: 15, rate: 6.67, label: 'Niveau 3 — Premium', requiredReferrals: 5, unlockFee: 10, totalReturn: 200, profit: 100 },
  4: { minAmount: 60.5, maxAmount: 150, totalCycles: 15, rate: 8.67, label: 'Niveau 4 — Elite', requiredReferrals: 10, unlockFee: 12, totalReturn: 230, profit: 130 },
  5: { minAmount: 150.5, maxAmount: 500, totalCycles: 15, rate: 13.33, label: 'Niveau 5 — VIP', requiredReferrals: 20, unlockFee: 15, totalReturn: 300, profit: 200 },
};

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { level, amount: requestedAmount } = body;

    if (!level || ![1, 2, 3, 4, 5].includes(level)) {
      return NextResponse.json({ success: false, error: 'Niveau invalide. Doit être entre 1 et 5.' }, { status: 400 });
    }

    const config = INVESTMENT_LEVELS[level];

    if (requestedAmount == null || typeof requestedAmount !== 'number' || isNaN(requestedAmount)) {
      return NextResponse.json({ success: false, error: 'Montant invalide.' }, { status: 400 });
    }

    const amount = Math.round(requestedAmount * 100) / 100;

    if (amount < config.minAmount || amount > config.maxAmount) {
      return NextResponse.json({ success: false, error: `Le montant doit être entre $${config.minAmount} et $${config.maxAmount} pour ${config.label}` }, { status: 400 });
    }

    // Check level unlock — user.unlockedLevel tracks the highest unlocked level
    if (level > user.unlockedLevel) {
      return NextResponse.json({
        success: false,
        error: `Niveau ${level} verrouillé. Débloquez-le d'abord.`,
        locked: true,
        level,
        requiredReferrals: config.requiredReferrals,
        currentReferrals: user.referralCount,
        unlockFee: config.unlockFee,
      }, { status: 403 });
    }

    // Sequential requirement: must have invested in previous level (for level > 1)
    if (level > 1) {
      const prevLevelInvestment = await db.investment.findFirst({
        where: { userId: user.id, level: level - 1 },
      });
      if (!prevLevelInvestment) {
        return NextResponse.json({
          success: false,
          error: `Vous devez d'abord investir au Niveau ${level - 1} avant d'accéder au Niveau ${level}.`,
          needPreviousLevel: true,
        }, { status: 403 });
      }
    }

    if (user.investBalance < amount) {
      return NextResponse.json({ success: false, error: `Solde insuffisant. Besoin de $${amount.toFixed(2)}, vous avez $${user.investBalance.toFixed(2)}` }, { status: 400 });
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
        detail: `Investissement créé: ${config.label} — $${amount.toFixed(2)} à ${config.rate}%/jour pendant ${config.totalCycles} jours`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      investment,
      message: `Investissement créé: $${amount.toFixed(2)} à ${config.rate}%/jour pendant ${config.totalCycles} jours`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
