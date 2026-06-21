import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

// Minimum video withdrawal is $1 (converted from $1 USD reference).
const MIN_WITHDRAWAL_USD = 1;

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // 3-day cycle rule: if a new cycle has begun (every 3 days of watching) and
    // the user hasn't cleared it yet, withdrawals are BLOCKED. They must clear
    // the cycle by depositing at investment Level 1 + inviting the required
    // number of referrals (cycle N needs N referrals).
    if (user.videoDepositRequired) {
      let daysWatching = 0;
      if (user.videoFirstWatchAt) {
        const diffMs = Date.now() - new Date(user.videoFirstWatchAt).getTime();
        daysWatching = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        if (daysWatching < 1) daysWatching = 1;
      }
      const currentCycle = Math.max(0, Math.floor((daysWatching - 1) / 3));
      const requiredReferrals = currentCycle;

      return NextResponse.json({
        success: false,
        depositRequired: true,
        currentCycle,
        requiredReferrals,
        hasLevel1Investment: false,
        error: `Action requise: après 3 jours de vidéos, vous devez déposer au Niveau 1 d'investissement et inviter ${requiredReferrals} parrainé(s) pour continuer les retraits.`,
      }, { status: 400 });
    }

    const body = await request.json();
    const { amount, method, userAddress } = body;

    if (amount == null || typeof amount !== 'number' || isNaN(amount) || amount < MIN_WITHDRAWAL_USD) {
      return NextResponse.json({
        success: false,
        error: 'Le retrait minimum est de $1.',
      }, { status: 400 });
    }

    if (!['yas', 'trx'].includes(method)) {
      return NextResponse.json({ success: false, error: 'Méthode invalide. Choisissez YAS ou TRX.' }, { status: 400 });
    }

    if (!userAddress || !String(userAddress).trim()) {
      return NextResponse.json({ success: false, error: 'Adresse de retrait requise.' }, { status: 400 });
    }

    if (user.videoBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Solde vidéo insuffisant. Votre solde: $${user.videoBalance.toFixed(2)}. Minimum de retrait: $${MIN_WITHDRAWAL_USD}.`,
      }, { status: 400 });
    }

    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = config?.cfaUsdRate || 600;
    const amountCfa = amount * cfaUsdRate;
    const type = method === 'trx' ? 'video_trx' : 'video_yas';

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { videoBalance: { decrement: amount } },
      });
      await tx.withdrawal.create({
        data: {
          userId: user.id,
          amount,
          amountCfa,
          type,
          trxAddress: method === 'trx' ? userAddress.trim() : null,
          yasAccount: method === 'yas' ? userAddress.trim() : null,
          status: 'pending',
        },
      });
      await tx.userNotification.create({
        data: {
          userId: user.id,
          type: 'withdrawal_pending',
          title: 'Retrait en cours de traitement',
          message: `Votre demande de retrait de $${amount.toFixed(2)} depuis le compte Vidéo a été prise en compte. Les fonds seront disponibles dans les 6 heures.`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Demande de retrait prise en compte. Les fonds seront disponibles dans les 6 heures.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
