import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { initiateOtp, verifyOtp } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'send') {
      // Send OTP to user's email after successful password check
      const { email, purpose } = body;
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email requis' });
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const otpPurpose = purpose || 'login';
      const result = await initiateOtp(email, user.name, otpPurpose as 'login' | 'password_reset' | 'email_verification', 5);

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
      const { email, code, purpose } = body;
      if (!email || !code) {
        return NextResponse.json({ success: false, error: 'Email et code requis' });
      }

      const otpPurpose = purpose || 'login';
      const result = await verifyOtp(email, code, otpPurpose);
      if (!result.valid) {
        return NextResponse.json({ success: false, error: result.error || 'Code invalide' });
      }

      // For email_verification purpose: mark email as verified and log the user in
      if (otpPurpose === 'email_verification') {
        await db.user.update({
          where: { email },
          data: { emailVerified: true },
        });
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

      // Check 48h withdrawal eligibility
      const firstDepositDate = user.firstDepositAt;
      const canWithdraw = firstDepositDate
        ? (now.getTime() - new Date(firstDepositDate).getTime()) >= 48 * 60 * 60 * 1000
        : false;

      const hoursUntilWithdrawal = firstDepositDate && !canWithdraw
        ? Math.ceil(48 - (now.getTime() - new Date(firstDepositDate).getTime()) / (60 * 60 * 1000))
        : 0;

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
          requiredReferrals: (() => {
            const nextWithdrawalNumber = completedWithdrawals + 1;
            return Math.max(1, Math.ceil(nextWithdrawalNumber / 2));
          })(),
          needsReferral: (() => {
            const nextWithdrawalNumber = completedWithdrawals + 1;
            const required = Math.max(1, Math.ceil(nextWithdrawalNumber / 2));
            return required > user.referralCount;
          })(),
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
