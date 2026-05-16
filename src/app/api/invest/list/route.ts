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

    const investments = await db.investment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const investmentsWithCountdown = investments.map((inv) => {
      let canClaim = false;
      let nextClaimIn = 0;

      if (inv.status === 'active' && inv.nextClaimAt) {
        if (now >= inv.nextClaimAt) {
          canClaim = true;
        } else {
          nextClaimIn = inv.nextClaimAt.getTime() - now.getTime();
        }
      }

      const remainingCycles = Math.max(0, inv.totalCycles - inv.doneCycles);
      const potentialEarning = Math.round(inv.amount * inv.rate / 100 * remainingCycles * 100) / 100;

      return {
        ...inv,
        canClaim,
        nextClaimInMs: nextClaimIn,
        remainingCycles,
        potentialEarning,
        progressPercent: Math.round((inv.doneCycles / inv.totalCycles) * 100),
      };
    });

    const activeInvestments = investmentsWithCountdown.filter((i) => i.status === 'active');
    const completedInvestments = investmentsWithCountdown.filter((i) => i.status === 'completed');
    const totalEarned = investments.reduce((sum, i) => sum + i.earned, 0);
    const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);

    return NextResponse.json({
      success: true,
      investments: investmentsWithCountdown,
      summary: {
        total: investments.length,
        active: activeInvestments.length,
        completed: completedInvestments.length,
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalInvested: Math.round(totalInvested * 100) / 100,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
