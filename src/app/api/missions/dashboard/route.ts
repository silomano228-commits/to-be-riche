import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';

// GET /api/missions/dashboard — User's mission dashboard data
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthToken(request);
    if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const userId = authUser.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        missionBalance: true,
        missionTotalEarned: true,
        missionValidatedToday: true,
        missionDate: true,
        cautionBalance: true,
        cautionStatus: true,
        personalDepositBalance: true,
        userLevel: true,
        validatedReferralCount: true,
        hasOverdueLoan: true,
        accountVerified: true,
        referralCode: true,
        referralCount: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];

    // Reset daily count if new day
    let validatedToday = user.missionValidatedToday;
    if (user.missionDate !== today) {
      validatedToday = 0;
      await db.user.update({
        where: { id: userId },
        data: { missionValidatedToday: 0, missionDate: today },
      });
    }

    // Get today's total submissions
    const todaySubmissions = await db.missionImage.count({
      where: { userId, submittedDate: today },
    });

    // Active campaigns count
    const now = new Date();
    const activeCampaigns = await db.campaign.count({
      where: {
        status: 'active',
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
    });

    // Recent images
    const recentImages = await db.missionImage.findMany({
      where: { userId },
      include: { campaign: { select: { name: true, brand: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Active loans
    const activeLoans = await db.microLoan.count({
      where: { userId, status: { in: ['active', 'repaying'] } },
    });

    // Pending loans
    const pendingLoans = await db.microLoan.count({
      where: { userId, status: 'pending' },
    });

    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = config?.cfaUsdRate || 550;
    const missionRewardCfa = config?.missionRewardCfa || 25;
    const missionDailyLimit = config?.missionDailyLimit || 10;
    const missionObjectiveCfa = config?.missionObjectiveCfa || 2500;
    const cautionAmountCfa = config?.cautionAmountCfa || 5000;

    return NextResponse.json({
      success: true,
      dashboard: {
        missionBalance: user.missionBalance,
        missionTotalEarned: user.missionTotalEarned,
        missionTotalEarnedCfa: Math.round(user.missionTotalEarned * cfaUsdRate),
        missionBalanceCfa: Math.round(user.missionBalance * cfaUsdRate),
        validatedToday,
        todaySubmissions,
        dailyLimit: missionDailyLimit,
        rewardPerImage: missionRewardCfa,
        objectiveCfa: missionObjectiveCfa,
        cautionBalance: user.cautionBalance,
        cautionBalanceCfa: Math.round(user.cautionBalance * cfaUsdRate),
        cautionStatus: user.cautionStatus,
        cautionAmountCfa,
        personalDepositBalance: user.personalDepositBalance,
        userLevel: user.userLevel,
        validatedReferralCount: user.validatedReferralCount,
        referralCount: user.referralCount,
        hasOverdueLoan: user.hasOverdueLoan,
        accountVerified: user.accountVerified,
        referralCode: user.referralCode,
        activeCampaigns,
        activeLoans,
        pendingLoans,
        recentImages,
      },
    });
  } catch (error: any) {
    console.error('[missions/dashboard] Error:', error);
    return NextResponse.json({ success: false, error: String(error?.message || error) }, { status: 500 });
  }
}
