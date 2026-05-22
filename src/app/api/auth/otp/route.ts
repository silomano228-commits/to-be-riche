import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { initiateOtp, verifyOtp } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'send') {
      // Send OTP to user's email after successful password check
      const { email } = body;
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email requis' });
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const result = await initiateOtp(email, user.name, 'login', 5);

      if (!result.sent) {
        return NextResponse.json({ success: false, error: result.error || 'Erreur envoi email' });
      }

      return NextResponse.json({
        success: true,
        message: 'Code OTP envoyé',
        plain_code: result.plain_code, // only set in simulation mode
      });
    }

    if (action === 'verify') {
      // Verify the OTP code
      const { email, code } = body;
      if (!email || !code) {
        return NextResponse.json({ success: false, error: 'Email et code requis' });
      }

      const result = await verifyOtp(email, code, 'login');
      if (!result.valid) {
        return NextResponse.json({ success: false, error: result.error || 'Code invalide' });
      }

      // OTP is valid - return user data for login completion
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const { password: _, ...safeUser } = user;

      const transactions = await db.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      const investments = await db.investment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      const activeTradesCount = await db.trade.count({
        where: { userId: user.id, resolved: false },
      });

      const activeEnterprisesCount = await db.enterprise.count({
        where: { userId: user.id, status: 'active' },
      });

      const now = new Date();
      const activeInvestments = investments.filter((i) => i.status === 'active');
      const claimableInvestments = activeInvestments.filter(
        (i) => i.nextClaimAt && now >= i.nextClaimAt
      );

      const canWithdraw = true;
      const hoursUntilWithdrawal = 0;

      const completedWithdrawals = await db.withdrawal.count({
        where: { userId: user.id, status: 'approved' },
      });

      const response = NextResponse.json({
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
          requiredReferrals: 0,
          needsReferral: false,
        },
      });

      response.cookies.set('br_token', user.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false,
        sameSite: 'lax',
        secure: false,
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Action invalide' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
