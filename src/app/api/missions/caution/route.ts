import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';

// POST /api/missions/caution — Deposit caution (5,000 FCFA)
export async function POST(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const config = await ensureSiteConfig();
  const cautionUsd = config.cautionAmountCfa / config.cfaUsdRate;

  if (user.cautionStatus === 'active') {
    return NextResponse.json({ error: 'Caution déjà constituée' }, { status: 400 });
  }

  // Check if user has enough balance (principal or personal deposit)
  const availableBalance = user.balance + user.personalDepositBalance;
  if (availableBalance < cautionUsd) {
    return NextResponse.json({
      error: `Solde insuffisant. ${config.cautionAmountCfa} FCFA requis pour la caution.`,
      requiredCfa: config.cautionAmountCfa,
      availableCfa: Math.round(availableBalance * config.cfaUsdRate),
    }, { status: 400 });
  }

  // Deduct from principal balance first, then personal deposit
  let remaining = cautionUsd;
  let deductedFromBalance = 0;
  let deductedFromDeposit = 0;

  if (user.balance >= remaining) {
    deductedFromBalance = remaining;
    remaining = 0;
  } else {
    deductedFromBalance = user.balance;
    remaining -= user.balance;
    deductedFromDeposit = remaining;
  }

  await db.user.update({
    where: { id: userId },
    data: {
      balance: { decrement: deductedFromBalance },
      personalDepositBalance: { decrement: deductedFromDeposit },
      cautionBalance: cautionUsd,
      cautionStatus: 'active',
    },
  });

  await db.transaction.create({
    data: {
      userId,
      type: 'caution_deposit',
      amount: -cautionUsd,
      detail: `Caution sécurisée: ${config.cautionAmountCfa} FCFA (BLOQUÉE)`,
    },
  });

  await db.userNotification.create({
    data: {
      userId,
      type: 'caution_deposited',
      title: 'Caution constituée',
      message: `Votre caution de ${config.cautionAmountCfa} FCFA a été sécurisée. Elle n'est pas disponible pour les retraits.`,
      link: 'missions',
    },
  });

  return NextResponse.json({
    success: true,
    cautionBalance: cautionUsd,
    cautionBalanceCfa: config.cautionAmountCfa,
    cautionStatus: 'active',
  });
}
