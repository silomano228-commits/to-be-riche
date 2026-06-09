import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { amount } = await request.json();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      return NextResponse.json({ success: false, error: 'Minimum 10 $' });
    }

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    // Direct deposit — credits balance immediately
    const isFirstDeposit = !user.hasInvested;

    const updatedUser = await db.user.update({
      where: { id: token },
      data: {
        balance: { increment: amt },
        hasInvested: true,
        depositCount: { increment: 1 },
        firstDepositAt: isFirstDeposit ? new Date() : undefined,
      },
    });

    await db.transaction.create({
      data: {
        type: 'deposit',
        amount: amt,
        detail: `Dépôt direct de ${amt.toFixed(2)} $`,
        userId: token,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: updatedUser.balance,
        investBalance: updatedUser.investBalance,
        tradeBalance: updatedUser.tradeBalance,
        projectBalance: updatedUser.projectBalance,
        hasInvested: true,
        depositCount: updatedUser.depositCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
