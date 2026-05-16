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
      if (email === 'admin@berich.com' && password === 'Admin@2024') {
        user = await db.user.create({
          data: { email, name: 'Admin', password, role: 'admin', referralCode: 'BR-ADMIN' },
        });
      } else {
        return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
      }
    }

    if (user.password !== password) {
      return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
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

    const response = NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        investBalance: user.investBalance,
        totalProfit: user.totalProfit,
        totalLoss: user.totalLoss,
        transactions,
        investments,
        activeTradesCount,
        activeEnterprisesCount,
      },
    });

    // Set cookie on the response object (reliable method)
    response.cookies.set('br_token', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
