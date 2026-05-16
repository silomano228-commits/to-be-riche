import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  // Try custom header first (most reliable)
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  // Then try cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

async function checkAdmin(request: Request) {
  const token = getToken(request);
  if (!token) return { error: NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 }), admin: null };
  const admin = await db.user.findUnique({ where: { id: token } });
  if (!admin || admin.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin };
}

export { checkAdmin, getToken };

// GET — Admin data
export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let totalBalance = 0;
    let totalInvestBalance = 0;
    let totalProfit = 0;
    let totalLoss = 0;

    for (const u of users) {
      totalBalance += u.balance;
      totalInvestBalance += u.investBalance;
      totalProfit += u.totalProfit;
      totalLoss += u.totalLoss;
    }

    // Get counts for new economic models
    const activeInvestments = await db.investment.count({ where: { status: 'active' } });
    const activeTrades = await db.trade.count({ where: { resolved: false } });
    const activeEnterprises = await db.enterprise.count({ where: { status: 'active' } });

    // Get referral info for each user - find who they referred
    const referralMap = new Map<string, { name: string; email: string; hasInvested: boolean; date: string }[]>();
    for (const u of users) {
      if (u.referralCode) {
        const referred = users
          .filter(r => r.referredByCode === u.referralCode)
          .map(r => ({
            name: r.name,
            email: r.email,
            hasInvested: r.hasInvested,
            date: new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
          }));
        if (referred.length > 0) {
          referralMap.set(u.id, referred);
        }
      }
    }

    const safeUsers = users.map(({ password: _, firstDepositAt: fda, lastClaimAt: lca, ...u }) => ({
      ...u,
      investBalance: u.investBalance,
      totalProfit: u.totalProfit,
      totalLoss: u.totalLoss,
      referredUsers: referralMap.get(u.id) || [],
    }));

    return NextResponse.json({
      success: true,
      users: safeUsers,
      stats: {
        total_users: users.length,
        total_balance: Math.round(totalBalance * 100) / 100,
        total_invest_balance: Math.round(totalInvestBalance * 100) / 100,
        total_profit: Math.round(totalProfit * 100) / 100,
        total_loss: Math.round(totalLoss * 100) / 100,
        active_investments: activeInvestments,
        active_trades: activeTrades,
        active_enterprises: activeEnterprises,
        total_referrals: users.filter(u => u.referredByCode).length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
