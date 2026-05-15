import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;

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
      },
    });
  } catch {
    return NextResponse.json({ success: false });
  }
}
