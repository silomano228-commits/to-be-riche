import { db } from '@/lib/db';
import { getRequiredReferrals, needsMoreReferrals, tryClaimReferralReward } from '@/lib/referral';
import { generateSessionToken, initiateOtp } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email et mot de passe requis' });
    }

    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // Auto-seed admin on first login attempt
      if (email === 'silomano228@gmail.com' && password === 'Admin@2024') {
        // Anti-fraud (hidden): the admin account is also bound to a
        // sessionToken, just like any regular account.
        user = await db.user.create({
          data: { email, name: 'Admin', password, role: 'admin', referralCode: 'BR-ADMIN', emailVerified: true, sessionToken: generateSessionToken() },
        });
      } else {
        return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
      }
    }

    if (user.password !== password) {
      return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Email verification gate: accounts that haven't verified their email
    // cannot log in. We send a fresh OTP email and tell the frontend to
    // switch to the verification screen. The admin auto-seed sets
    // emailVerified: true so this never blocks the admin.
    if (!user.emailVerified) {
      const otpResult = await initiateOtp(email, user.name, 'email_verification', 10);
      return NextResponse.json({
        success: false,
        needs_verification: true,
        email,
        message: 'Vérifiez votre email pour activer votre compte',
        plain_code: otpResult.plain_code, // only set in simulation mode
      });
    }

    // Anti-fraud (hidden): rotate the sessionToken on every successful login.
    // This invalidates any previous session for this account on another
    // device (the old cookie's sessionToken no longer matches the user
    // record). Single active session per account is enforced.
    const sessionToken = generateSessionToken();
    await db.user.update({ where: { id: user.id }, data: { sessionToken } });
    user.sessionToken = sessionToken;

    // Direct login for all users — no OTP required
    const { password: _, sessionToken: __, ...safeUser } = user;

    // Safety-net: claim the $5 referral gift if the user has reached 12
    // active referrals but the gift was never credited (e.g. register-time
    // credit failed, or referrals were counted manually by an admin).
    // Idempotent — no-op if already claimed.
    await tryClaimReferralReward(user);
    if (user.referralCount >= 12 && !user.referralRewardClaimed) {
      const refreshed = await db.user.findUnique({ where: { id: user.id } });
      if (refreshed) Object.assign(user, refreshed);
    }

    // Parallelize all independent DB queries
    const [transactions, investments, activeTradesCount, activeEnterprisesCount, completedWithdrawals] = await Promise.all([
      db.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      db.investment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      db.trade.count({ where: { userId: user.id, resolved: false } }),
      db.enterprise.count({ where: { userId: user.id, status: 'active' } }),
      db.withdrawal.count({ where: { userId: user.id, status: 'approved' } }),
    ]);

    const now = new Date();
    const activeInvestments = investments.filter((i) => i.status === 'active');
    const claimableInvestments = activeInvestments.filter((i) => i.nextClaimAt && now >= i.nextClaimAt);

    // Check 48h withdrawal eligibility
    const firstDepositDate = user.firstDepositAt;
    const canWithdraw = user.role === 'admin' ? true : firstDepositDate
      ? (now.getTime() - new Date(firstDepositDate).getTime()) >= 48 * 60 * 60 * 1000
      : false;

    const hoursUntilWithdrawal = firstDepositDate && !canWithdraw
      ? Math.ceil(48 - (now.getTime() - new Date(firstDepositDate).getTime()) / (60 * 60 * 1000))
      : 0;

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

    // Anti-fraud (hidden): the br_token cookie now holds the sessionToken
    // (NOT user.id). A new login rotates the token, so any older session on
    // another device will fail session validation and be logged out.
    response.cookies.set('br_token', sessionToken, { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: false, sameSite: 'lax', secure: false });
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
