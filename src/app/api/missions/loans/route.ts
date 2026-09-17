import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';

// GET /api/missions/loans — List user's loans
export async function GET(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const loans = await db.microLoan.findMany({
    where: { userId },
    include: { repayments: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, loans });
}

// POST /api/missions/loans — Request a micro-loan
export async function POST(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const body = await request.json();
  const { amountCfa } = body;

  if (![5000, 10000].includes(amountCfa)) {
    return NextResponse.json({ error: 'Montant invalide (5000 ou 10000 FCFA)' }, { status: 400 });
  }

  const config = await ensureSiteConfig();
  const cfaUsdRate = config.cfaUsdRate;

  // Check no active/pending loan
  const activeLoan = await db.microLoan.findFirst({
    where: { userId, status: { in: ['pending', 'approved', 'active', 'repaying'] } },
  });
  if (activeLoan) {
    return NextResponse.json({ error: 'Vous avez déjà un prêt en cours' }, { status: 400 });
  }

  // Check eligibility
  const requiredFundsUsd = (amountCfa === 5000 ? config.loanSmallFundsCfa : config.loanLargeFundsCfa) / cfaUsdRate;
  const requiredReferrals = amountCfa === 5000 ? config.loanSmallReferrals : config.loanLargeReferrals;
  const cautionRequiredUsd = config.cautionAmountCfa / cfaUsdRate;

  const missing: string[] = [];
  if (user.missionTotalEarned < requiredFundsUsd) {
    const diff = Math.round((requiredFundsUsd - user.missionTotalEarned) * cfaUsdRate);
    missing.push(`Gains insuffisants (manque ${diff} FCFA)`);
  }
  if (user.cautionBalance < cautionRequiredUsd) {
    missing.push(`Caution non constituée (${config.cautionAmountCfa} FCFA requis)`);
  }
  if (user.validatedReferralCount < requiredReferrals) {
    missing.push(`Parrainages insuffisants (${user.validatedReferralCount}/${requiredReferrals})`);
  }
  if (user.accountVerified !== 'verified') {
    missing.push('Compte non vérifié');
  }
  if (user.hasOverdueLoan) {
    missing.push('Prêt en retard');
  }

  if (missing.length > 0) {
    return NextResponse.json({ error: 'Conditions non remplies', missing, eligible: false }, { status: 400 });
  }

  // Create loan request
  const loan = await db.microLoan.create({
    data: {
      userId,
      amountCfa,
      amountRemainingCfa: amountCfa,
      status: 'pending',
      graceDaysRemaining: config.loanOverdueGraceDays,
    },
  });

  // Create notification
  await db.userNotification.create({
    data: {
      userId,
      type: 'loan_requested',
      title: 'Demande de prêt',
      message: `Votre demande de prêt de ${amountCfa} FCFA a été enregistrée et est en attente d'analyse.`,
      link: 'missions',
    },
  });

  // Create admin notification
  await db.adminNotification.create({
    data: {
      type: 'loan_request',
      title: 'Nouvelle demande de prêt',
      message: `${user.name} demande un prêt de ${amountCfa} FCFA`,
      userId,
    },
  });

  return NextResponse.json({ success: true, loan });
}
