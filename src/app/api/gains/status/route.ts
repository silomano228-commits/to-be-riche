import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET — Check available daily gains for the user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    if (!user.hasInvested) {
      return NextResponse.json({
        success: true,
        canClaim: false,
        reason: 'no_investment',
        message: 'Vous devez d\'abord investir',
      });
    }

    // Get user's active projects
    const projects = await db.project.findMany({
      where: { userId: token, status: 'active' },
    });

    if (projects.length === 0) {
      return NextResponse.json({
        success: true,
        canClaim: false,
        reason: 'no_project',
        message: 'Aucun projet actif',
      });
    }

    // Check if already claimed today
    const today = new Date().toISOString().split('T')[0];
    const alreadyClaimed = await db.dailyGain.findFirst({
      where: { userId: token, date: today },
    });

    // Calculate potential gains for each project (using current dailyRate)
    const projectGains = projects.map(p => {
      const rate = p.dailyRate;
      const gainAmount = Math.round(p.amount * rate / 100 * 100) / 100;
      return {
        projectId: p.id,
        projectName: p.name,
        investedAmount: p.amount,
        dailyRate: rate,
        potentialGain: gainAmount,
      };
    });

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

    return NextResponse.json({
      success: true,
      canClaim: !alreadyClaimed,
      alreadyClaimedToday: !!alreadyClaimed,
      projectGains,
      totalPotentialGain,
      earnings: user.earnings,
      invested: user.invested,
      canWithdraw,
      hoursUntilWithdrawal,
      firstDepositAt: user.firstDepositAt,
      lastClaimAt: user.lastClaimAt,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
