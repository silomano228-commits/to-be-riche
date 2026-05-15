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

    // Generate random daily rate between 7% and 15%
    const dailyRate = Math.round((Math.random() * 8 + 7) * 100) / 100;

    // Project categories
    const categories = ['Tech', 'Énergie', 'Agro', 'Finance', 'Immobilier', 'Santé'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    // Credit invested amount (no instant bonus — gains come from daily claims)
    const isFirstDeposit = !user.hasInvested;

    const updatedUser = await db.user.update({
      where: { id: token },
      data: {
        invested: { increment: amt },
        balance: { increment: amt },
        hasInvested: true,
        depositCount: { increment: 1 },
        firstDepositAt: isFirstDeposit ? new Date() : undefined,
      },
    });

    // Create or update project for this deposit
    // Each deposit creates a new project that generates daily gains
    await db.project.create({
      data: {
        name: `Projet ${category} #${user.depositCount + 1}`,
        amount: amt,
        receivedAmount: 0,
        description: `Investissement de ${amt.toFixed(2)} $ dans le secteur ${category}`,
        dailyRate,
        category,
        status: 'active',
        userId: token,
      },
    });

    await db.transaction.create({
      data: {
        type: 'deposit',
        amount: amt,
        gain: 0,
        userId: token,
      },
    });

    const { password: _, ...safeUser } = updatedUser;
    return NextResponse.json({
      success: true,
      data: {
        balance: updatedUser.balance,
        total_earnings: updatedUser.earnings,
        total_invested: updatedUser.invested,
        has_invested: true,
        deposit_count: updatedUser.depositCount,
        dailyRate,
        category,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
