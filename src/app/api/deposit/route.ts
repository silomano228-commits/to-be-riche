import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

const MAX_DEPOSIT = 50000; // Maximum single deposit amount

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { amount } = await request.json();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum 5 $' });
    }
    if (amt > MAX_DEPOSIT) {
      return NextResponse.json({ success: false, error: `Maximum de dépôt: $${MAX_DEPOSIT}` });
    }

    // Direct deposit — credits balance immediately (atomic transaction)
    const isFirstDeposit = !user.hasInvested;

    const updatedUser = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: amt },
          hasInvested: true,
          depositCount: { increment: 1 },
          firstDepositAt: isFirstDeposit ? new Date() : undefined,
        },
      });

      await tx.transaction.create({
        data: {
          type: 'deposit',
          amount: amt,
          detail: `Dépôt direct de ${amt.toFixed(2)} $`,
          userId: user.id,
        },
      });

      return updated;
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
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}