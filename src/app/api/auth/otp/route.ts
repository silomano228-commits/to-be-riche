import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { initiateOtp, verifyOtp, generateSessionToken } from '@/lib/auth';
import { getRequiredReferrals, needsMoreReferrals } from '@/lib/referral';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'send') {
      const { email, purpose } = body;
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email requis' });
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const otpPurpose = purpose || 'email_verification';
      const result = await initiateOtp(email, user.name, otpPurpose as 'email_verification' | 'password_reset', 10);

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
      const { email, code, purpose } = body;
      if (!email || !code) {
        return NextResponse.json({ success: false, error: 'Email et code requis' });
      }

      const otpPurpose = purpose || 'email_verification';
      const result = await verifyOtp(email, code, otpPurpose);
      if (!result.valid) {
        return NextResponse.json({ success: false, error: result.error || 'Code invalide' });
      }

      // For email_verification: mark email as verified and log the user in
      if (otpPurpose === 'email_verification') {
        // Anti-fraud (hidden): rotate the sessionToken on email verification
        // (completes registration). This invalidates the pre-verification
        // sessionToken that was minted at /register, so any cookie issued
        // before verification can no longer be used.
        await db.user.update({
          where: { email },
          data: { emailVerified: true, sessionToken: generateSessionToken() },
        });
      }

      // Return user data for login completion
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const { password: _, sessionToken: __, ...safeUser } = user;

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

      const firstDepositDate = user.firstDepositAt;
      const canWithdraw = user.role === 'admin' ? true : firstDepositDate
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
          requiredReferrals: getRequiredReferrals(completedWithdrawals),
          needsReferral: needsMoreReferrals(completedWithdrawals, user.referralCount),
          unlockedLevel: user.unlockedLevel,
        },
      });

      // Anti-fraud (hidden): set the br_token cookie to the user's current
      // sessionToken (NOT user.id). The sessionToken was just rotated above,
      // so this is the single valid session for this account.
      response.cookies.set('br_token', user.sessionToken || '', {
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
