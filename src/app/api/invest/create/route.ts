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

// Investment levels — 3 levels, all at 5%/day, unlimited collection days
// (totalCycles = 0 means unlimited — the user can collect every day forever).
// Deposits are made DIRECTLY via YAS or TRX at every level (no investBalance).
// Levels 2 and 3 unlock via referrals only (12 / 25). There is NO sequential
// previous-level requirement, and a user may create MULTIPLE active investments
// at the same level (as many as they want).
const INVESTMENT_LEVELS: Record<number, {
  minAmount: number; maxAmount: number; rate: number;
  label: string; requiredReferrals: number; category: string;
}> = {
  1: { minAmount: 5, maxAmount: 15, rate: 5, label: 'Niveau 1 — Débutant', requiredReferrals: 0, category: 'petit' },
  2: { minAmount: 65, maxAmount: 250, rate: 5, label: 'Niveau 2 — Business', requiredReferrals: 12, category: 'gros' },
  3: { minAmount: 500, maxAmount: 3000, rate: 5, label: 'Niveau 3 — Elite', requiredReferrals: 25, category: 'gros' },
};

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { level, amount: requestedAmount, paymentMethod, userAddress } = body;

    if (!level || ![1, 2, 3].includes(level)) {
      return NextResponse.json({ success: false, error: 'Niveau invalide. Doit être entre 1 et 3.' }, { status: 400 });
    }

    const config = INVESTMENT_LEVELS[level];

    if (requestedAmount == null || typeof requestedAmount !== 'number' || isNaN(requestedAmount)) {
      return NextResponse.json({ success: false, error: 'Montant invalide.' }, { status: 400 });
    }

    const amount = Math.round(requestedAmount * 100) / 100;

    if (amount < config.minAmount || amount > config.maxAmount) {
      return NextResponse.json({ success: false, error: `Le montant doit être entre $${config.minAmount} et $${config.maxAmount} pour ${config.label}` }, { status: 400 });
    }

    // Payment must be made directly via YAS or TRX at every level
    if (!['yas', 'trx'].includes(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Méthode de paiement invalide. Choisissez YAS ou TRX.' }, { status: 400 });
    }

    if (!userAddress || !userAddress.trim()) {
      return NextResponse.json({ success: false, error: 'Adresse de paiement requise.' }, { status: 400 });
    }

    // Check level unlock — user.unlockedLevel tracks the highest unlocked level
    if (level > user.unlockedLevel) {
      return NextResponse.json({
        success: false,
        error: `Niveau ${level} verrouillé. Débloquez-le d'abord avec ${config.requiredReferrals} parrainé(s).`,
        locked: true,
        level,
        requiredReferrals: config.requiredReferrals,
        currentReferrals: user.referralCount,
      }, { status: 403 });
    }

    // NOTE: There is NO sequential previous-level requirement and NO limit on
    // the number of active investments a user can hold at the same level.
    // Users may invest as many times as they want at any unlocked level.

    const siteConfig = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const trxPrice = siteConfig?.trxUsdPrice || 0.12;
    const cfaUsdRate = siteConfig?.cfaUsdRate || 600;

    const now = new Date();
    // nextClaimAt = 24h from now. totalCycles = 0 means UNLIMITED collection days.
    const nextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create the investment (active immediately, unlimited cycles)
    const investment = await db.investment.create({
      data: {
        userId: user.id,
        level,
        amount,
        rate: config.rate,
        totalCycles: 0, // 0 = unlimited
        doneCycles: 0,
        earned: 0,
        status: 'active',
        nextClaimAt,
        finishesAt: null, // never finishes (unlimited)
      },
    });

    // Create the pending deposit record (YAS or TRX) for this investment.
    // The investment is active immediately; the deposit is processed by admin.
    if (paymentMethod === 'trx') {
      const amountTrx = amount / trxPrice;
      await db.pendingDeposit.create({
        data: {
          userId: user.id,
          amountUsd: amount,
          amountTrx,
          trxPrice,
          userAddress: userAddress.trim(),
          destination: `invest_level_${level}`,
          status: 'pending',
        },
      });
    } else {
      const amountCfa = amount * cfaUsdRate;
      const amountTrx = amount / trxPrice;
      await db.yasDeposit.create({
        data: {
          userId: user.id,
          amountCfa,
          amountUsd: amount,
          amountTrx,
          trxPrice,
          yasAccount: userAddress.trim(),
          destination: `invest_level_${level}`,
          status: 'pending',
        },
      });
    }

    // Create transaction record
    await db.transaction.create({
      data: {
        type: 'invest_create',
        amount: -amount,
        detail: `Investissement créé: ${config.label} — $${amount.toFixed(2)} à ${config.rate}%/jour (collecte illimitée) — Paiement ${paymentMethod.toUpperCase()}`,
        userId: user.id,
      },
    });

    // Notify user
    await db.userNotification.create({
      data: {
        userId: user.id,
        type: 'investment_created',
        title: 'Investissement créé !',
        message: `Votre investissement ${config.label} de $${amount.toFixed(2)} est actif. Paiement ${paymentMethod.toUpperCase()} en cours de traitement. Les fonds seront disponibles dans les 6 heures. Collecte quotidienne illimitée !`,
      },
    });

    return NextResponse.json({
      success: true,
      investment,
      paymentMethod,
      message: `Investissement créé: $${amount.toFixed(2)} à ${config.rate}%/jour. Paiement ${paymentMethod.toUpperCase()} en cours — fonds disponibles dans les 6 heures. Collecte illimitée !`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
