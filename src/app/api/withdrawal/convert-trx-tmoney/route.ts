import { db } from '@/lib/db';
import { getRequiredReferrals } from '@/lib/referral';
import { NextResponse } from 'next/server';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

export const dynamic = 'force-dynamic';

// POST — Create a TRX → Yas conversion request
// User sends TRX from their wallet to admin's TRX address, then admin sends FCFA to user's Yas account
export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const body = await request.json();
    const { amountUsd, trxAddress, yasAccount } = body;

    // Validate amount
    const amt = parseFloat(amountUsd);
    if (isNaN(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum de conversion : 5 $' });
    }

    // Can only convert from main balance
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
          error: `Première conversion possible dans ${hoursLeft}h après votre premier dépôt`,
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
        error: `Parrainage obligatoire ! Vous devez parrainer au moins ${needed} personne${needed > 1 ? 's' : ''} supplémentaire${needed > 1 ? 's' : ''}. Partagez votre code : ${user.referralCode}`,
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

    // Validate Yas account
    const trimmedYas = (yasAccount || '').trim();
    if (!/^\d{8}$/.test(trimmedYas)) {
      return NextResponse.json({ success: false, error: 'Numéro Yas invalide (8 chiffres requis)' });
    }
    const prefix = trimmedYas.substring(0, 2);
    if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
      return NextResponse.json({ success: false, error: 'Numéro Yas invalide (commence par 90-93 ou 70-73)' });
    }

    // Check if user already has a pending withdrawal (any type)
    const pendingW = await db.withdrawal.findFirst({
      where: { userId: user.id, status: { in: ['pending', 'approved'] } },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait/conversion en attente' });
    }

    // Get CFA rate from config
    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = config?.cfaUsdRate || 600;
    const amountCfa = Math.round(amt * cfaUsdRate);

    // Create withdrawal request with type 'convert_trx_tmoney'
    // Balance is NOT deducted here — admin confirms TRX reception first, then executes
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

    // Create pending transaction record
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
    console.error('[CONVERT-TRX-TMONEY] Error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
