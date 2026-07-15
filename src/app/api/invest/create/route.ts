import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { validatePaymentAddress } from '@/lib/payment';
import { notifyAdmin } from '@/lib/notify';

export const dynamic = 'force-dynamic';

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
    const user = await getAuthToken(request);
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

    if (!['yas', 'trx'].includes(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Méthode de paiement invalide. Choisissez YAS ou TRX.' }, { status: 400 });
    }

    if (!userAddress || !userAddress.trim()) {
      return NextResponse.json({ success: false, error: 'Adresse de paiement requise.' }, { status: 400 });
    }

    const addressErr = validatePaymentAddress(paymentMethod as 'yas' | 'trx', userAddress);
    if (addressErr) {
      return NextResponse.json({ success: false, error: addressErr }, { status: 400 });
    }

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

    const siteConfig = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const trxPrice = siteConfig?.trxUsdPrice || 0.12;
    const cfaUsdRate = siteConfig?.cfaUsdRate || 600;

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

    await db.transaction.create({
      data: {
        type: 'invest_create',
        amount: -amount,
        detail: `Demande d'investissement ${config.label} — $${amount.toFixed(2)} à ${config.rate}%/jour (collecte illimitée) — Paiement ${paymentMethodStr.toUpperCase()} — En attente d'approbation admin`,
        userId: user.id,
      },
    });

    await db.userNotification.create({
      data: {
        userId: user.id,
        type: 'investment_pending',
        title: 'Demande de dépôt envoyée',
        message: `Votre demande de dépôt d'investissement ${config.label} de $${amount.toFixed(2)} a été envoyée.`,
        link: 'invest',
      },
    });

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
      message: `Votre demande de dépôt a été envoyée. L'administrateur va l'approuver avant que les fonds ne soient disponibles.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}