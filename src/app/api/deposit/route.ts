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

    const gain = Math.round(amt * 0.1 * 100) / 100;

    const user = await db.user.update({
      where: { id: token },
      data: {
        invested: { increment: amt },
        balance: { increment: amt + gain },
        earnings: { increment: gain },
        hasInvested: true,
        depositCount: { increment: 1 },
      },
    });

    await db.transaction.create({
      data: {
        type: 'deposit',
        amount: amt,
        gain,
        userId: token,
      },
    });

    const { password: _, ...safeUser } = user;
    return NextResponse.json({
      success: true,
      data: {
        balance: user.balance,
        total_earnings: user.earnings,
        total_invested: user.invested,
        has_invested: 1,
        deposit_count: user.depositCount,
      },
      gain,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
