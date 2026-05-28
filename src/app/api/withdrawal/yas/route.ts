import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { getRequiredReferrals } from '@/lib/referral';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST — Create a YAS withdrawal request (user enters USD, we convert to CFA)
export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const body = await request.json();
    const { amountUsd, yasAccount } = body;

    // Validate amount
    const amt = parseFloat(amountUsd);
    if (isNaN(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum de retrait : 5 $' });
    }

    // Check balance (can only withdraw from compte principal)
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

    // Check referral requirement (1 filleul par tranche de 4 retraits)
    const completedWithdrawals = await db.withdrawal.count({
      where: { userId: user.id, status: 'executed' },
    });
    const requiredReferrals = getRequiredReferrals(completedWithdrawals);

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
      where: { userId: user.id, status: { in: ['pending', 'approved'] } },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait en attente' });
    }

    // Get CFA rate from site config
    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = config?.cfaUsdRate || 600;
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
      },
    });

    // Create pending transaction record
    await db.transaction.create({
      data: {
        type: 'withdrawal_pending',
        amount: -amt,
        detail: `Retrait Yas en attente — ${amt} $ (${amountCfa.toLocaleString()} FCFA) vers ${yasAccount.trim()}`,
        userId: user.id,
      },
    });

    // Notify admin (non-blocking HTTP call to chat service)
    fetch('http://localhost:3003/notify-withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        withdrawalId: withdrawal.id,
        type: 'yas',
        userId: user.id,
        userName: user.name,
        amount: amt,
        amountCfa,
        yasAccount: yasAccount.trim(),
      }),
    }).catch(() => {});

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
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });

    // Check for pending YAS withdrawal
    const pendingYas = await db.withdrawal.findFirst({
      where: { userId: user.id, type: 'yas', status: { in: ['pending', 'approved'] } },
    });

    return NextResponse.json({
      success: true,
      data: {
        cfaUsdRate: config?.cfaUsdRate || 600,
        pendingYasWithdrawal: pendingYas,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
