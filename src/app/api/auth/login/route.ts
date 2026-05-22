import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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
        user = await db.user.create({
          data: { email, name: 'Admin', password, role: 'admin', referralCode: 'BR-ADMIN', emailVerified: true },
        });
      } else {
        return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
      }
    }

    if (user.password !== password) {
      return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Admin users skip OTP for convenience (direct access)
    if (user.role === 'admin') {
      const { password: _, ...safeUser } = user;
      const transactions = await db.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
      const investments = await db.investment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
      const activeTradesCount = await db.trade.count({ where: { userId: user.id, resolved: false } });
      const activeEnterprisesCount = await db.enterprise.count({ where: { userId: user.id, status: 'active' } });
      const now = new Date();
      const activeInvestments = investments.filter((i) => i.status === 'active');
      const claimableInvestments = activeInvestments.filter((i) => i.nextClaimAt && now >= i.nextClaimAt);
      const completedWithdrawals = await db.withdrawal.count({ where: { userId: user.id, status: 'approved' } });

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
          canWithdraw: true,
          hoursUntilWithdrawal: 0,
          completedWithdrawals,
          requiredReferrals: 0,
          needsReferral: false,
        },
      });
      response.cookies.set('br_token', user.id, { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: false, sameSite: 'lax', secure: false });
      return response;
    }

    // Password is correct — require OTP verification before full login
    return NextResponse.json({
      success: true,
      requires_otp: true,
      email: user.email,
      message: 'Vérification OTP requise',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
