import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET — Check withdrawal status (pending withdrawals for current user)
export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    const withdrawals = await db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: withdrawals });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}

// POST — Create a withdrawal request (only from gains/earnings account, 48h after first deposit)
export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    const body = await request.json();
    const { amount, trxAddress } = body;

    // Validate amount
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum de retrait : 5 $' });
    }

    // Can only withdraw from earnings (gains balance)
    if (amt > user.earnings) {
      return NextResponse.json({ success: false, error: 'Solde de gains insuffisant. Seul le solde de gains est retirable.' });
    }

    // 48h cooldown after first deposit
    if (user.firstDepositAt) {
      const hoursSinceFirstDeposit = (Date.now() - new Date(user.firstDepositAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceFirstDeposit < 48) {
        const hoursLeft = Math.ceil(48 - hoursSinceFirstDeposit);
        return NextResponse.json({
          success: false,
          error: `Premier retrait possible dans ${hoursLeft}h après votre premier dépôt`,
          hoursLeft,
        });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Aucun dépôt trouvé' });
    }

    // Check referral requirement
    const completedWithdrawals = await db.withdrawal.count({
      where: { userId: user.id, status: 'approved' },
    });
    const nextWithdrawalNumber = completedWithdrawals + 1;
    const requiredReferrals = nextWithdrawalNumber >= 3
      ? Math.ceil((nextWithdrawalNumber - 2) / 2)
      : 0;

    if (requiredReferrals > user.referralCount) {
      const needed = requiredReferrals - user.referralCount;
      return NextResponse.json({
        success: false,
        error: `Parrainage obligatoire ! Vous devez parrainer au moins ${needed} personne${needed > 1 ? 's' : ''} supplémentaire${needed > 1 ? 's' : ''} pour effectuer ce retrait. Partagez votre code : ${user.referralCode}`,
        needsReferral: true,
        requiredReferrals,
        currentReferrals: user.referralCount,
        referralCode: user.referralCode,
      });
    }

    // Validate TRX address
    if (!trxAddress || trxAddress.length < 20) {
      return NextResponse.json({ success: false, error: 'Adresse TRX invalide' });
    }

    // Check if user already has a pending withdrawal
    const pendingW = await db.withdrawal.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait en attente' });
    }

    // Deduct from earnings and balance
    await db.user.update({
      where: { id: user.id },
      data: {
        earnings: { decrement: amt },
        balance: { decrement: amt },
      },
    });

    // Create withdrawal request
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount: amt,
        trxAddress,
        status: 'pending',
      },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        type: 'withdrawal',
        amount: amt,
        gain: 0,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, data: { id: withdrawal.id, amount: amt, status: 'pending' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
