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

export async function GET(request: Request) {
  try {
    // Auto-seed admin if not exists
    const adminExists = await db.user.findUnique({ where: { email: 'silomano228@gmail.com' } });
    if (!adminExists) {
      await db.user.create({
        data: { email: 'silomano228@gmail.com', name: 'Admin', password: 'Admin@2024', role: 'admin', referralCode: 'BR-ADMIN', emailVerified: true },
      });
    }

    // Auto-seed SiteConfig if not exists
    const configExists = await db.siteConfig.findUnique({ where: { id: 'main' } });
    if (!configExists) {
      await db.siteConfig.create({ data: { id: 'main', adminTrxAddress: '', trxUsdPrice: 0.12 } });
    }

    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ success: false });
    }

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) {
      return NextResponse.json({ success: false });
    }

    const { password: _, ...safeUser } = user;
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Investments
    const investments = await db.investment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Active trades count
    const activeTradesCount = await db.trade.count({
      where: { userId: user.id, resolved: false },
    });

    // Enterprises count
    const activeEnterprisesCount = await db.enterprise.count({
      where: { userId: user.id, status: 'active' },
    });

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

    // Count completed withdrawals
    const completedWithdrawals = await db.withdrawal.count({
      where: { userId: user.id, status: 'approved' },
    });

    // Calculate referral requirement for next withdrawal
    const nextWithdrawalNumber = completedWithdrawals + 1;
    const requiredReferrals = Math.max(1, Math.ceil(nextWithdrawalNumber / 2));
    const needsReferral = requiredReferrals > user.referralCount;

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
      },
    });
  } catch {
    return NextResponse.json({ success: false });
  }
}
