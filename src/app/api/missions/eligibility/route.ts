import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';

// GET /api/missions/eligibility — Check loan eligibility
export async function GET(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const config = await ensureSiteConfig();
  const cfaUsdRate = config.cfaUsdRate;

  // Convert thresholds to USD for comparison
  const loanSmallFundsUsd = config.loanSmallFundsCfa / cfaUsdRate;
  const loanLargeFundsUsd = config.loanLargeFundsCfa / cfaUsdRate;
  const cautionRequiredUsd = config.cautionAmountCfa / cfaUsdRate;

  // Check active/pending loans
  const activeLoan = await db.microLoan.findFirst({
    where: { userId, status: { in: ['pending', 'approved', 'active', 'repaying'] } },
  });

  // Small loan (5,000 FCFA) eligibility
  const smallLoan = {
    amountCfa: config.loanSmallCfa,
    fundsEligible: user.missionTotalEarned >= loanSmallFundsUsd,
    fundsCurrent: Math.round(user.missionTotalEarned * cfaUsdRate),
    fundsRequired: config.loanSmallFundsCfa,
    cautionReady: user.cautionBalance >= cautionRequiredUsd,
    cautionCurrent: Math.round(user.cautionBalance * cfaUsdRate),
    cautionRequired: config.cautionAmountCfa,
    referralsOk: user.validatedReferralCount >= config.loanSmallReferrals,
    referralsCurrent: user.validatedReferralCount,
    referralsRequired: config.loanSmallReferrals,
    accountVerified: user.accountVerified === 'verified',
    noOverdueLoan: !user.hasOverdueLoan,
    noActiveLoan: !activeLoan,
    eligible: false,
  };
  smallLoan.eligible = smallLoan.fundsEligible && smallLoan.cautionReady && smallLoan.referralsOk && smallLoan.accountVerified && smallLoan.noOverdueLoan && smallLoan.noActiveLoan;

  // Large loan (10,000 FCFA) eligibility
  const largeLoan = {
    amountCfa: config.loanLargeCfa,
    fundsEligible: user.missionTotalEarned >= loanLargeFundsUsd,
    fundsCurrent: Math.round(user.missionTotalEarned * cfaUsdRate),
    fundsRequired: config.loanLargeFundsCfa,
    cautionReady: user.cautionBalance >= cautionRequiredUsd,
    cautionCurrent: Math.round(user.cautionBalance * cfaUsdRate),
    cautionRequired: config.cautionAmountCfa,
    referralsOk: user.validatedReferralCount >= config.loanLargeReferrals,
    referralsCurrent: user.validatedReferralCount,
    referralsRequired: config.loanLargeReferrals,
    accountVerified: user.accountVerified === 'verified',
    noOverdueLoan: !user.hasOverdueLoan,
    noActiveLoan: !activeLoan,
    eligible: false,
  };
  largeLoan.eligible = largeLoan.fundsEligible && largeLoan.cautionReady && largeLoan.referralsOk && largeLoan.accountVerified && largeLoan.noOverdueLoan && largeLoan.noActiveLoan;

  // Determine user level
  let level = 1;
  let levelLabel = 'Nouveau';
  if (user.missionTotalEarned > 0) { level = 2; levelLabel = 'Actif'; }
  if (smallLoan.eligible) { level = 3; levelLabel = 'Éligible'; }
  if (user.missionTotalEarned >= loanLargeFundsUsd && user.validatedReferralCount >= config.loanLargeReferrals) { level = 4; levelLabel = 'Fiable'; }

  return NextResponse.json({
    success: true,
    eligibility: { smallLoan, largeLoan },
    userLevel: level,
    userLevelLabel: levelLabel,
    activeLoan: activeLoan ? { id: activeLoan.id, amountCfa: activeLoan.amountCfa, status: activeLoan.status, amountRemainingCfa: activeLoan.amountRemainingCfa } : null,
  });
}
