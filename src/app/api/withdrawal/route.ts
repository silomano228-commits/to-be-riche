import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { getRequiredReferrals } from '@/lib/referral';
import { notifyAdmin, notifyUser } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET — Check withdrawal status (pending withdrawals for current user)
export async function GET(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' });

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
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const body = await request.json();
    const { amount, trxAddress, sourceAccount } = body;

    // Validate amount — $1 minimum for video account, $5 for all others
    const src = sourceAccount || 'jeu';
    const amt = parseFloat(amount);
    const minWithdrawal = src === 'video' ? 1 : 5;
    if (isNaN(amt) || !isFinite(amt) || amt < minWithdrawal) {
      return NextResponse.json({ success: false, error: `Minimum de retrait : ${minWithdrawal} $` });
    }
    if (amt > 50000) {
      return NextResponse.json({ success: false, error: 'Maximum de retrait : 50 000 $' });
    }

    // Re-read user fresh to prevent TOCTOU race condition
    const freshUser = await db.user.findUnique({ where: { id: user.id } });
    if (!freshUser) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const balanceMap: Record<string, number> = {
      jeu: freshUser.balance || 0,
      investissement: freshUser.investBalance || 0,
      projet: freshUser.projectBalance || 0,
      video: freshUser.videoBalance || 0,
    };
    const srcBalance = balanceMap[src] ?? freshUser.balance;
    const srcLabel = src === 'jeu' ? 'compte jeu' : src === 'investissement' ? 'compte investissement' : src === 'projet' ? 'compte projet' : 'compte vidéo';

    if (amt > srcBalance) {
      return NextResponse.json({ success: false, error: `Solde insuffisant sur le ${srcLabel}.` });
    }

    // 48h cooldown after first deposit
    if (freshUser.firstDepositAt) {
      const hoursSinceFirstDeposit = (Date.now() - new Date(freshUser.firstDepositAt).getTime()) / (1000 * 60 * 60);
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

    // Check referral requirement (1 filleul par tranche de 4 retraits)
    const completedWithdrawals = await db.withdrawal.count({
      where: { userId: user.id, status: 'executed' },
    });
    const requiredReferrals = getRequiredReferrals(completedWithdrawals);

    if (requiredReferrals > freshUser.referralCount) {
      const needed = requiredReferrals - freshUser.referralCount;
      return NextResponse.json({
        success: false,
        error: `Parrainage obligatoire ! Vous devez parrainer au moins ${needed} personne${needed > 1 ? 's' : ''} supplémentaire${needed > 1 ? 's' : ''} pour effectuer ce retrait. Partagez votre code : ${user.referralCode}`,
        needsReferral: true,
        requiredReferrals,
        currentReferrals: freshUser.referralCount,
        referralCode: freshUser.referralCode,
      });
    }

    // Validate TRX address (must start with T and be 34 characters)
    const trimmedTrxAddr = (trxAddress || '').trim();
    if (!trimmedTrxAddr || !/^T[A-Za-z0-9]{33}$/.test(trimmedTrxAddr)) {
      return NextResponse.json({ success: false, error: 'Adresse TRX invalide (doit commencer par T et faire 34 caractères)' });
    }

    // Check if user already has a pending withdrawal (any type)
    // Only block if status is 'pending' — approved withdrawals are being processed by admin
    const pendingW = await db.withdrawal.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait en attente de validation' });
    }

    // Create withdrawal request (no balance deduction — admin approves then executes)
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount: amt,
        type: 'trx',
        trxAddress: trimmedTrxAddr,
        status: 'pending',
        sourceAccount: src,
      },
    });

    // Create pending transaction record
    await db.transaction.create({
      data: {
        type: 'withdrawal_pending',
        amount: -amt,
        detail: `Retrait TRX en attente — ${amt} $ vers ${trimmedTrxAddr} (${srcLabel})`,
        userId: user.id,
      },
    });

    // Notify admin about new withdrawal request
    await notifyAdmin({
      type: 'new_withdrawal',
      title: 'Nouvelle demande de retrait',
      message: `${freshUser.name} demande un retrait de ${amt.toFixed(2)} $ (TRX) vers ${trimmedTrxAddr}`,
      userId: user.id,
    });

    // Notify user that their withdrawal request has been received
    await notifyUser({
      userId: user.id,
      type: 'withdrawal_pending',
      title: 'Demande de retrait prise en compte',
      message: 'Votre demande de retrait a été prise en compte et sera traitée prochainement.',
      link: 'wallet',
    });

    return NextResponse.json({ success: true, data: { id: withdrawal.id, amount: amt, status: 'pending' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
