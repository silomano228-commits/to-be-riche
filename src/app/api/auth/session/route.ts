import { db } from '@/lib/db';
import { ensureSiteConfig } from '@/lib/site-config';
import { getRequiredReferrals, needsMoreReferrals } from '@/lib/referral';
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

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

export async function GET(request: Request) {
  try {
    // One-time initialization: seed admin & site config
    await ensureInitialized();

    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ success: false });
    }

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) {
      return NextResponse.json({ success: false });
    }

    const { password: _, ...safeUser } = user;

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
