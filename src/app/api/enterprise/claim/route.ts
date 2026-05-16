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
    const { enterpriseId } = body;

    if (!enterpriseId) {
      return NextResponse.json({ success: false, error: 'Enterprise ID is required' }, { status: 400 });
    }

    const enterprise = await db.enterprise.findUnique({
      where: { id: enterpriseId },
    });

    if (!enterprise || enterprise.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Enterprise not found' }, { status: 404 });
    }

    if (enterprise.status !== 'active') {
      return NextResponse.json({ success: false, error: `Enterprise is already ${enterprise.status}` }, { status: 400 });
    }

    const now = new Date();
    if (now < enterprise.finishesAt) {
      const daysRemaining = Math.ceil((enterprise.finishesAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return NextResponse.json({
        success: false,
        error: `Enterprise not finished yet. ${daysRemaining} day(s) remaining.`,
      }, { status: 400 });
    }

    // Calculate random return within minReturn-maxReturn range
    const returnPercent = Math.round(
      (enterprise.minReturn + Math.random() * (enterprise.maxReturn - enterprise.minReturn)) * 100
    ) / 100;
    const returnAmount = Math.round(enterprise.amount * returnPercent / 100 * 100) / 100;
    const totalReturn = Math.round((enterprise.amount + returnAmount) * 100) / 100;

    await db.$transaction([
      db.enterprise.update({
        where: { id: enterpriseId },
        data: {
          status: 'completed',
          finalReturn: returnPercent,
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: totalReturn },
          totalProfit: { increment: returnAmount },
        },
      }),
      db.transaction.create({
        data: {
          type: 'enterprise_claim',
          amount: totalReturn,
          detail: `Enterprise completed: ${enterprise.name} — $${enterprise.amount.toFixed(2)} principal + $${returnAmount.toFixed(2)} profit (${returnPercent}% return)`,
          userId: user.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      result: {
        enterpriseName: enterprise.name,
        principal: enterprise.amount,
        returnPercent,
        profit: returnAmount,
        totalReturn,
      },
      message: `Enterprise ${enterprise.name} completed! $${returnAmount.toFixed(2)} profit (${returnPercent}%). Total credited: $${totalReturn.toFixed(2)}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
