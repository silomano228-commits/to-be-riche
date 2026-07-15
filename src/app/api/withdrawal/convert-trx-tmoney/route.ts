import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { getRequiredReferrals } from '@/lib/referral';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_WITHDRAWAL = 50000;

// POST — Create a TRX → Yas conversion request
export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const body = await request.json();
    const { amountUsd, trxAddress, yasAccount } = body;

    const amt = parseFloat(amountUsd);
    if (isNaN(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum de conversion : 5 $' });
    }
    if (amt > MAX_WITHDRAWAL) {
      return NextResponse.json({ success: false, error: `Maximum de conversion: $${MAX_WITHDRAWAL}` });
    }

    // Re-read user fresh inside a transaction to prevent TOCTOU race
    const freshUser = await db.user.findUnique({ where: { id: user.id } });
    if (!freshUser) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    // Can only convert from main balance
    if (amt > freshUser.balance) {
      return NextResponse.json({ success: false, error: 'Solde insuffisant sur le compte principal.' });
    }

    // 48h cooldown after first deposit
    if (freshUser.firstDepositAt) {
      const hoursSinceFirstDeposit = (Date.now() - new Date(freshUser.firstDepositAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceFirstDeposit < 48) {
        const hoursLeft = Math.ceil(48 - hoursSinceFirstDeposit);
        return NextResponse.json({
          success: false,
          error: `Première conversion possible dans ${hoursLeft}h après votre premier dépôt`,
          hoursLeft,
        });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Aucun dépôt trouvé' });
    }

    const completedWithdrawals = await db.withdrawal.count({
      where: { userId: user.id, status: 'executed' },
    });
    const requiredReferrals = getRequiredReferrals(completedWithdrawals);

    if (requiredReferrals > freshUser.referralCount) {
      const needed = requiredReferrals - freshUser.referralCount;
      return NextResponse.json({
        success: false,
        error: `Parrainage obligatoire ! Vous devez parrainer au moins ${needed} personne${needed > 1 ? 's' : ''} supplémentaire${needed > 1 ? 's' : ''}. Partagez votre code : ${freshUser.referralCode}`,
        needsReferral: true,
        requiredReferrals,
        currentReferrals: freshUser.referralCount,
        referralCode: freshUser.referralCode,
      });
    }

    if (!trxAddress || trxAddress.length < 20) {
      return NextResponse.json({ success: false, error: 'Adresse TRX invalide' });
    }

    const trimmedYas = (yasAccount || '').trim();
    if (!/^\d{8}$/.test(trimmedYas)) {
      return NextResponse.json({ success: false, error: 'Numéro Yas invalide (8 chiffres requis)' });
    }
    const prefix = trimmedYas.substring(0, 2);
    if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
      return NextResponse.json({ success: false, error: 'Numéro Yas invalide (commence par 90-93 ou 70-73)' });
    }

    const pendingW = await db.withdrawal.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait/conversion en attente' });
    }

    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = config?.cfaUsdRate || 600;
    const amountCfa = Math.round(amt * cfaUsdRate);

    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount: amt,
        amountCfa,
        type: 'convert_trx_tmoney',
        trxAddress,
        yasAccount: trimmedYas,
        status: 'pending',
      },
    });

    await db.transaction.create({
      data: {
        type: 'withdrawal_pending',
        amount: -amt,
        detail: `Conversion TRX→Yas en attente — ${amt} $ (${amountCfa.toLocaleString()} FCFA vers ${trimmedYas})`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: withdrawal.id,
        amount: amt,
        amountCfa,
        trxAddress,
        yasAccount: trimmedYas,
        status: 'pending',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}