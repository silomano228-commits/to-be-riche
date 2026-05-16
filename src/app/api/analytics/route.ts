import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Investment stats
    const investments = await db.investment.findMany({
      where: { userId: user.id },
    });
    const activeInvestments = investments.filter((i) => i.status === 'active');
    const completedInvestments = investments.filter((i) => i.status === 'completed');
    const totalInvestedAmount = investments.reduce((sum, i) => sum + i.amount, 0);
    const totalInvestmentEarned = investments.reduce((sum, i) => sum + i.earned, 0);

    // Trade stats
    const allTrades = await db.trade.findMany({
      where: { userId: user.id },
    });
    const activeTrades = allTrades.filter((t) => !t.resolved);
    const resolvedTrades = allTrades.filter((t) => t.resolved);
    const wonTrades = resolvedTrades.filter((t) => t.result === 'win');
    const lostTrades = resolvedTrades.filter((t) => t.result === 'lose');
    const drawnTrades = resolvedTrades.filter((t) => t.result === 'draw');
    const tradeProfit = wonTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const tradeLoss = lostTrades.reduce((sum, t) => sum + t.amount, 0);

    // Enterprise stats
    const enterprises = await db.enterprise.findMany({
      where: { userId: user.id },
    });
    const activeEnterprises = enterprises.filter((e) => e.status === 'active');
    const completedEnterprises = enterprises.filter((e) => e.status === 'completed');
    const crashedEnterprises = enterprises.filter((e) => e.status === 'crashed');
    const totalEnterpriseInvested = enterprises.reduce((sum, e) => sum + e.amount, 0);
    const totalEnterpriseLost = crashedEnterprises.reduce((sum, e) => sum + e.amount, 0);

    // Transaction stats
    const recentTransactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Net profit calculation
    const netProfit = user.totalProfit - user.totalLoss;

    return NextResponse.json({
      success: true,
      analytics: {
        user: {
          balance: user.balance,
          investBalance: user.investBalance,
          totalBalance: Math.round((user.balance + user.investBalance) * 100) / 100,
          totalProfit: user.totalProfit,
          totalLoss: user.totalLoss,
          netProfit: Math.round(netProfit * 100) / 100,
        },
        investments: {
          total: investments.length,
          active: activeInvestments.length,
          completed: completedInvestments.length,
          totalInvested: Math.round(totalInvestedAmount * 100) / 100,
          totalEarned: Math.round(totalInvestmentEarned * 100) / 100,
        },
        trades: {
          total: allTrades.length,
          active: activeTrades.length,
          resolved: resolvedTrades.length,
          won: wonTrades.length,
          lost: lostTrades.length,
          drawn: drawnTrades.length,
          winRate: resolvedTrades.length > 0
            ? Math.round(wonTrades.length / resolvedTrades.length * 10000) / 100
            : 0,
          totalProfit: Math.round(tradeProfit * 100) / 100,
          totalLoss: Math.round(tradeLoss * 100) / 100,
        },
        enterprises: {
          total: enterprises.length,
          active: activeEnterprises.length,
          completed: completedEnterprises.length,
          crashed: crashedEnterprises.length,
          totalInvested: Math.round(totalEnterpriseInvested * 100) / 100,
          totalLost: Math.round(totalEnterpriseLost * 100) / 100,
          crashRate: enterprises.length > 0
            ? Math.round(crashedEnterprises.length / enterprises.length * 10000) / 100
            : 0,
        },
        recentTransactions,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
