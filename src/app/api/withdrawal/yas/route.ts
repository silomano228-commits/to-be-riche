import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { getRequiredReferrals } from '@/lib/referral';
import { notifyAdmin } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST — Create a YAS withdrawal request (user enters USD, we convert to CFA)
export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const body = await request.json();
    const { amountUsd, yasAccount, sourceAccount } = body;

    // Validate amount
    const amt = parseFloat(amountUsd);
    if (isNaN(amt) || !isFinite(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum de retrait : 5 $' });
    }
    if (amt > 50000) {
      return NextResponse.json({ success: false, error: 'Maximum de retrait : 50 000 $' });
    }

    // Re-read user fresh to prevent TOCTOU race condition
    const freshUser = await db.user.findUnique({ where: { id: user.id } });
    if (!freshUser) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const src = sourceAccount || 'jeu';
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

    // Validate YAS account (phone number)
    if (!yasAccount || !/^\d{8}$/.test(yasAccount.trim())) {
      return NextResponse.json({ success: false, error: 'Numéro Yas invalide (8 chiffres requis)' });
    }
    const prefix = yasAccount.trim().substring(0, 2);
    if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
      return NextResponse.json({ success: false, error: 'Le numéro doit commencer par 90-93 ou 70-73' });
    }

    // Check if user already has a pending withdrawal (any type)
    const pendingW = await db.withdrawal.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait en attente' });
    }

    // Get CFA rate from site config
    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = config?.cfaUsdRate || 550;
    const amountCfa = Math.round(amt * cfaUsdRate);

    // Create withdrawal request (no balance deduction yet — admin approves then executes)
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount: amt,
        amountCfa,
        type: 'yas',
        yasAccount: yasAccount.trim(),
        status: 'pending',
        sourceAccount: src,
      },
    });

    // Create pending transaction record
    await db.transaction.create({
      data: {
        type: 'withdrawal_pending',
        amount: -amt,
        detail: `Retrait Yas en attente — ${amt} $ (${amountCfa.toLocaleString()} FCFA) vers ${yasAccount.trim()} (${srcLabel})`,
        userId: user.id,
      },
    });

    // Notify admin about new YAS withdrawal request
    await notifyAdmin({
      type: 'new_withdrawal',
      title: 'Nouvelle demande de retrait Yas',
      message: `${user.name} demande un retrait de ${amt.toFixed(2)} $ (${amountCfa.toLocaleString()} FCFA) via Yas vers ${yasAccount.trim()}`,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: withdrawal.id,
        amount: amt,
        amountCfa,
        yasAccount: yasAccount.trim(),
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('[YAS-WITHDRAWAL] Error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET — Check YAS config (cfaUsdRate) and pending YAS withdrawal for the form
export async function GET(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });

    // Check for pending YAS withdrawal
    const pendingYas = await db.withdrawal.findFirst({
      where: { userId: user.id, type: 'yas', status: 'pending' },
    });

    return NextResponse.json({
      success: true,
      data: {
        cfaUsdRate: config?.cfaUsdRate || 550,
        pendingYasWithdrawal: pendingYas,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
