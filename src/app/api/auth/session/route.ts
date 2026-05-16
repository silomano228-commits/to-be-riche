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
    const adminExists = await db.user.findUnique({ where: { email: 'admin@berich.com' } });
    if (!adminExists) {
      await db.user.create({
        data: { email: 'admin@berich.com', name: 'Admin', password: 'Admin@2024', role: 'admin', referralCode: 'BR-ADMIN' },
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

    const projects = await db.project.findMany({
      where: { userId: user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    // Check if already claimed today
    const today = new Date().toISOString().split('T')[0];
    const todayGain = await db.dailyGain.findFirst({
      where: { userId: user.id, date: today },
    });

    // Calculate potential gains
    const projectGains = projects.map(p => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      dailyRate: p.dailyRate,
      category: p.category,
      potentialGain: Math.round(p.amount * p.dailyRate / 100 * 100) / 100,
    }));

    const totalPotentialGain = projectGains.reduce((sum, g) => sum + g.potentialGain, 0);

    // Check 48h withdrawal eligibility
    const firstDepositDate = user.firstDepositAt;
    const now = new Date();
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
    // After 3rd withdrawal, referral becomes mandatory
    // Then every 2nd withdrawal after that requires another referral
    // So mandatory checkpoints are at withdrawal: 3, 5, 7, 9, ...
    // Required referrals = max(0, Math.ceil(Math.max(0, nextWithdrawalNumber - 2) / 2))
    const nextWithdrawalNumber = completedWithdrawals + 1;
    const requiredReferrals = nextWithdrawalNumber >= 3
      ? Math.ceil((nextWithdrawalNumber - 2) / 2)
      : 0;
    const needsReferral = requiredReferrals > user.referralCount;

    // Use the most recent project as the "main" project for backward compat
    const project = projects[0] || null;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        transactions,
        project,
        projects: projectGains,
        canClaimDailyGain: !todayGain && projects.length > 0,
        alreadyClaimedToday: !!todayGain,
        totalPotentialGain,
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
