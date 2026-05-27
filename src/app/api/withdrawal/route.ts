import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Inline auth token extraction to avoid importing @/lib/auth which pulls in heavy nodemailer
function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

export const dynamic = 'force-dynamic';

// GET — Check withdrawal status (pending withdrawals for current user)
export async function GET(request: Request) {
  try {
    const token = getToken(request);
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

// POST — Create a TRX withdrawal request (no balance deduction — admin approves then executes)
export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const body = await request.json();
    const { amount, trxAddress } = body;

    // Validate amount
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum de retrait : 5 $' });
    }

    // Can only withdraw from main balance (compte principal)
    if (amt > user.balance) {
      return NextResponse.json({ success: false, error: 'Solde insuffisant sur le compte principal.' });
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
      where: { userId: user.id, status: 'executed' },
    });
    const nextWithdrawalNumber = completedWithdrawals + 1;
    const requiredReferrals = Math.max(1, Math.ceil(nextWithdrawalNumber / 2));

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

    // Check if user already has a pending withdrawal (any type)
    const pendingW = await db.withdrawal.findFirst({
      where: { userId: user.id, status: { in: ['pending', 'approved'] } },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait en attente' });
    }

    // Create withdrawal request (no balance deduction — admin approves then executes)
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount: amt,
        type: 'trx',
        trxAddress,
        status: 'pending',
      },
    });

    // Create pending transaction record
    await db.transaction.create({
      data: {
        type: 'withdrawal_pending',
        amount: -amt,
        detail: `Retrait TRX en attente — ${amt} $ vers ${trxAddress}`,
        userId: user.id,
      },
    });

    // Notify admin (non-blocking HTTP call to chat service)
    fetch('http://localhost:3003/notify-withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        withdrawalId: withdrawal.id,
        type: 'trx',
        userId: user.id,
        userName: user.name,
        amount: amt,
        trxAddress,
      }),
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { id: withdrawal.id, amount: amt, status: 'pending' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
