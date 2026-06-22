import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { validatePaymentAddress } from '@/lib/payment';
import { notifyAdmin } from '@/lib/notify';

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

    // Format validation — same rules as the principal account deposit flow:
    //   YAS: 8 digits, starts with 90-93 or 70-73
    //   TRX: starts with 'T', at least 20 chars
    const addressErr = validatePaymentAddress(paymentMethod as 'yas' | 'trx', userAddress);
    if (addressErr) {
      return NextResponse.json({ success: false, error: addressErr }, { status: 400 });
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

    // ========================================================================
    // INVESTMENT APPROVAL FLOW (Task 7):
    // The Investment record is NOT created here. We only create a pending
    // deposit request (PendingDeposit for TRX / YasDeposit for YAS) with
    // type='investment' and the investment details (level, amount, payment
    // method). The admin must approve the deposit before the Investment is
    // actually created — and only then does the countdown (nextClaimAt,
    // finishesAt) start. See /api/admin/deposits and /api/admin/yas-deposits.
    // ========================================================================

    const paymentMethodStr = paymentMethod as 'yas' | 'trx';
    let pendingId: string | null = null;

    if (paymentMethodStr === 'trx') {
      const amountTrx = amount / trxPrice;
      const pending = await db.pendingDeposit.create({
        data: {
          userId: user.id,
          amountUsd: amount,
          amountTrx,
          trxPrice,
          userAddress: userAddress.trim(),
          destination: `invest_level_${level}`,
          status: 'pending',
          type: 'investment',
          investmentLevel: level,
          investmentAmount: amount,
          paymentMethod: 'trx',
        },
      });
      pendingId = pending.id;
    } else {
      const amountCfa = amount * cfaUsdRate;
      const amountTrx = amount / trxPrice;
      const pending = await db.yasDeposit.create({
        data: {
          userId: user.id,
          amountCfa,
          amountUsd: amount,
          amountTrx,
          trxPrice,
          yasAccount: userAddress.trim(),
          destination: `invest_level_${level}`,
          status: 'pending',
          type: 'investment',
          investmentLevel: level,
          investmentAmount: amount,
        },
      });
      pendingId = pending.id;
    }

    // Create a transaction record (informational — funds not yet invested)
    await db.transaction.create({
      data: {
        type: 'invest_create',
        amount: -amount,
        detail: `Demande d'investissement ${config.label} — $${amount.toFixed(2)} à ${config.rate}%/jour (collecte illimitée) — Paiement ${paymentMethodStr.toUpperCase()} — En attente d'approbation admin`,
        userId: user.id,
      },
    });

    // Notify user that their deposit request has been submitted
    await db.userNotification.create({
      data: {
        userId: user.id,
        type: 'investment_pending',
        title: 'Demande de dépôt envoyée',
        message: `Votre demande de dépôt d'investissement ${config.label} de $${amount.toFixed(2)} a été envoyée. L'administrateur va l'approuver avant que les fonds ne soient disponibles et que l'investissement commence. Le compte à rebours démarrera après l'approbation.`,
        link: 'invest',
      },
    });

    // Notify admin (badge count + admin notification panel)
    await notifyAdmin({
      type: 'investment_deposit_request',
      title: 'Nouvelle demande de dépôt d\'investissement',
      message: `${user.name} a demandé un dépôt d'investissement ${config.label} de $${amount.toFixed(2)} (${paymentMethodStr.toUpperCase()}) — en attente d'approbation.`,
      userId: user.id,
      depositId: pendingId,
    });

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      paymentMethod: paymentMethodStr,
      message: `Votre demande de dépôt a été envoyée. L'administrateur va l'approuver avant que les fonds ne soient disponibles et que l'investissement commence. Le compte à rebours démarrera après l'approbation.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
