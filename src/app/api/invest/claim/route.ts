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

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { investmentId } = body;

    if (!investmentId) {
      return NextResponse.json({ success: false, error: 'Investment ID is required' }, { status: 400 });
    }

    const investment = await db.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment || investment.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Investment not found' }, { status: 404 });
    }

    if (investment.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Investment is not active' }, { status: 400 });
    }

    const now = new Date();

    // Check 24h cooldown
    if (investment.nextClaimAt && now < investment.nextClaimAt) {
      const remaining = investment.nextClaimAt.getTime() - now.getTime();
      const hoursLeft = Math.ceil(remaining / (60 * 60 * 1000));
      return NextResponse.json({
        success: false,
        error: `Claim not available yet. ${hoursLeft} hour(s) remaining.`,
      }, { status: 400 });
    }

    // Calculate gain
    const gain = Math.round(investment.amount * investment.rate / 100 * 100) / 100;
    const newDoneCycles = investment.doneCycles + 1;
    const newEarned = Math.round((investment.earned + gain) * 100) / 100;
    const newNextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let completed = false;
    let finalGain = 0;

    if (newDoneCycles >= investment.totalCycles) {
      completed = true;
      // Return the principal amount to balance on completion
      finalGain = investment.amount;
    }

    // Add gain to user balance (principal account)
    const totalBalanceAdd = Math.round((gain + finalGain) * 100) / 100;

    await db.$transaction([
      db.investment.update({
        where: { id: investmentId },
        data: {
          doneCycles: newDoneCycles,
          earned: newEarned,
          lastClaimAt: now,
          nextClaimAt: completed ? null : newNextClaimAt,
          status: completed ? 'completed' : 'active',
          finishesAt: completed ? now : investment.finishesAt,
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          investBalance: { increment: totalBalanceAdd },
          totalProfit: { increment: gain },
        },
      }),
      db.transaction.create({
        data: {
          type: completed ? 'invest_claim_final' : 'invest_claim',
          amount: totalBalanceAdd,
          detail: completed
            ? `Investment claim (final): $${gain.toFixed(2)} gain + $${finalGain.toFixed(2)} principal returned — Cycle ${newDoneCycles}/${investment.totalCycles} COMPLETED`
            : `Investment claim: $${gain.toFixed(2)} gain — Cycle ${newDoneCycles}/${investment.totalCycles}`,
          userId: user.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      gain,
      finalGain: completed ? finalGain : 0,
      totalCredited: totalBalanceAdd,
      doneCycles: newDoneCycles,
      totalCycles: investment.totalCycles,
      completed,
      message: completed
        ? `Investment completed! Earned $${newEarned.toFixed(2)} total. Principal $${finalGain.toFixed(2)} returned.`
        : `Claimed $${gain.toFixed(2)} gain. Cycle ${newDoneCycles}/${investment.totalCycles}.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
