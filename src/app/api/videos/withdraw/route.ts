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

const MIN_WITHDRAWAL_USD = 5;

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, method, userAddress } = body;

    if (!amount || typeof amount !== 'number' || amount < MIN_WITHDRAWAL_USD) {
      return NextResponse.json({
        success: false,
        error: `Le retrait minimum est de $${MIN_WITHDRAWAL_USD}.`,
      }, { status: 400 });
    }

    if (!['yas', 'trx'].includes(method)) {
      return NextResponse.json({ success: false, error: 'Méthode de paiement invalide' }, { status: 400 });
    }

    if (!userAddress) {
      return NextResponse.json({ success: false, error: 'Adresse requise' }, { status: 400 });
    }

    if (user.videoBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Solde vidéo insuffisant. Solde: $${user.videoBalance.toFixed(2)}`,
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
          trxAddress: method === 'trx' ? userAddress : null,
          yasAccount: method === 'yas' ? userAddress : null,
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
