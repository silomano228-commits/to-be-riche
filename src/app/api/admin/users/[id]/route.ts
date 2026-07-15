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

async function checkAdmin(request: Request) {
  const token = getToken(request);
  if (!token) return { error: NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 }), admin: null };
  const admin = await db.user.findUnique({ where: { id: token } });
  if (!admin || admin.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin };
}

// GET — Detailed user info with referral tree
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // ---- Referral tree: all users this user has referred ----
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const referredUsers = await db.user.findMany({
      where: { referredByCode: user.referralCode },
      orderBy: { createdAt: 'desc' },
    });

    const referralTree = referredUsers.map(r => {
      const lastLogin = r.updatedAt;
      const isActive = lastLogin > sevenDaysAgo;
      const levelLabel = r.unlockedLevel >= 3 ? 'Niv. 3 — Elite' : r.unlockedLevel === 2 ? 'Niv. 2 — Business' : 'Niv. 1 — Débutant';
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        createdAt: r.createdAt.toISOString(),
        balance: r.balance,
        videoBalance: r.videoBalance,
        tradeBalance: r.tradeBalance,
        projectBalance: r.projectBalance,
        investBalance: r.investBalance,
        unlockedLevel: r.unlockedLevel,
        levelLabel,
        hasInvested: r.hasInvested,
        referralCount: r.referralCount,
        isActive,
        lastLogin: lastLogin.toISOString(),
      };
    });

    // ---- Aggregated stats ----
    const totalDeposited = await db.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: id, type: 'deposit', amount: { gt: 0 } },
    });

    const totalWithdrawn = await db.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: id, type: { in: ['withdrawal', 'withdrawal_trx', 'withdrawal_yas'] } },
    });

    // Use pending deposits + yas deposits for deposited count
    const approvedTrxDeposits = await db.pendingDeposit.count({
      where: { userId: id, status: 'approved' },
    });
    const approvedYasDeposits = await db.yasDeposit.count({
      where: { userId: id, status: 'approved' },
    });

    const investmentCount = await db.investment.count({
      where: { userId: id },
    });

    const videoWatchCount = await db.videoWatch.count({
      where: { userId: id },
    });

    // ---- Recent transactions (last 50) ----
    const recentTransactions = await db.transaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formattedTransactions = recentTransactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      detail: t.detail,
      createdAt: t.createdAt.toISOString(),
    }));

    // ---- Investment data ----
    const investments = await db.investment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedInvestments = investments.map(inv => ({
      id: inv.id,
      level: inv.level,
      amount: inv.amount,
      rate: inv.rate,
      earned: inv.earned,
      status: inv.status,
      doneCycles: inv.doneCycles,
      totalCycles: inv.totalCycles,
      nextClaimAt: inv.nextClaimAt?.toISOString() || null,
      finishesAt: inv.finishesAt?.toISOString() || null,
      createdAt: inv.createdAt.toISOString(),
    }));

    // ---- Withdrawals ----
    const withdrawals = await db.withdrawal.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formattedWithdrawals = withdrawals.map(w => ({
      id: w.id,
      amount: w.amount,
      amountCfa: w.amountCfa,
      type: w.type,
      status: w.status,
      adminNote: w.adminNote,
      sourceAccount: w.sourceAccount,
      createdAt: w.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        referralCode: user.referralCode,
        referredByCode: user.referredByCode,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        // Balances
        balance: user.balance,
        videoBalance: user.videoBalance,
        tradeBalance: user.tradeBalance,
        projectBalance: user.projectBalance,
        investBalance: user.investBalance,
        // Other fields
        hasInvested: user.hasInvested,
        depositCount: user.depositCount,
        firstDepositAt: user.firstDepositAt?.toISOString() || null,
        referralCount: user.referralCount,
        unlockedLevel: user.unlockedLevel,
        totalProfit: user.totalProfit,
        totalLoss: user.totalLoss,
        gameTotalWon: user.gameTotalWon,
        videoTotalEarned: user.videoTotalEarned,
        videoWatchedCount: user.videoWatchedCount,
        gameSpinsUsed: user.gameSpinsUsed,
      },
      stats: {
        totalDeposited: totalDeposited._sum.amount || 0,
        totalWithdrawn: totalWithdrawn._sum.amount || 0,
        depositCount: approvedTrxDeposits + approvedYasDeposits,
        investmentCount,
        videoWatchCount,
        referralCount: user.referralCount,
      },
      referralTree,
      recentTransactions: formattedTransactions,
      investments: formattedInvestments,
      withdrawals: formattedWithdrawals,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}