import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getDailyVideos, DAILY_VIDEO_LIMIT, getVideoReward, computeDayNumber, type VideoItem } from '@/lib/videos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const investments = await db.investment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const investmentsWithCountdown = investments.map((inv) => {
      let canClaim = false;
      let nextClaimIn = 0;

      if (inv.status === 'active' && inv.nextClaimAt) {
        if (now >= inv.nextClaimAt) {
          canClaim = true;
        } else {
          nextClaimIn = inv.nextClaimAt.getTime() - now.getTime();
        }
      }

      const unlimited = inv.totalCycles === 0;
      const remainingCycles = unlimited ? -1 : Math.max(0, inv.totalCycles - inv.doneCycles);
      const potentialEarning = unlimited
        ? Infinity
        : Math.round(inv.amount * inv.rate / 100 * remainingCycles * 100) / 100;
      const progressPercent = unlimited ? 0 : Math.round((inv.doneCycles / inv.totalCycles) * 100);

      return {
        ...inv,
        canClaim,
        nextClaimInMs: nextClaimIn,
        unlimited,
        remainingCycles,
        potentialEarning,
        progressPercent,
      };
    });

    const activeInvestments = investmentsWithCountdown.filter((i) => i.status === 'active');
    const completedInvestments = investmentsWithCountdown.filter((i) => i.status === 'completed');
    const totalEarned = investments.reduce((sum, i) => sum + i.earned, 0);
    const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);

    const [pendingTrx, pendingYas] = await Promise.all([
      db.pendingDeposit.findMany({
        where: { userId: user.id, type: 'investment', status: 'pending' },
        orderBy: { createdAt: 'desc' },
      }),
      db.yasDeposit.findMany({
        where: { userId: user.id, type: 'investment', status: 'pending' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const pendingInvestmentRequests = [
      ...pendingTrx.map((d) => ({
        id: d.id,
        kind: 'trx' as const,
        level: d.investmentLevel ?? 1,
        amount: d.investmentAmount ?? d.amountUsd,
        paymentMethod: 'trx' as const,
        createdAt: d.createdAt.toISOString(),
      })),
      ...pendingYas.map((d) => ({
        id: d.id,
        kind: 'yas' as const,
        level: d.investmentLevel ?? 1,
        amount: d.investmentAmount ?? d.amountUsd,
        paymentMethod: 'yas' as const,
        createdAt: d.createdAt.toISOString(),
      })),
    ];

    const LEVELS = [
      { level: 1, min: 5, max: 15, rate: 5, requiredReferrals: 0, label: 'Niveau 1 — Débutant' },
      { level: 2, min: 65, max: 250, rate: 5, requiredReferrals: 12, label: 'Niveau 2 — Business' },
      { level: 3, min: 500, max: 3000, rate: 5, requiredReferrals: 25, label: 'Niveau 3 — Elite' },
    ];

    return NextResponse.json({
      success: true,
      investments: investmentsWithCountdown,
      pendingInvestmentRequests,
      summary: {
        total: investments.length,
        active: activeInvestments.length,
        completed: completedInvestments.length,
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalInvested: Math.round(totalInvested * 100) / 100,
        unlockedLevel: user.unlockedLevel,
        referralCount: user.referralCount,
        levelCount: 3,
        levels: LEVELS,
        pendingCount: pendingInvestmentRequests.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}