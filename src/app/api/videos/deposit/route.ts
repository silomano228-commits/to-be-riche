import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MIN_DEPOSIT_USD = 5;

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, method, userAddress } = body;

    if (!amount || typeof amount !== 'number' || amount < MIN_DEPOSIT_USD) {
      return NextResponse.json({
        success: false,
        error: `Le dépôt minimum est de $${MIN_DEPOSIT_USD}.`,
      }, { status: 400 });
    }

    if (!['yas', 'trx'].includes(method)) {
      return NextResponse.json({ success: false, error: 'Méthode de paiement invalide' }, { status: 400 });
    }

    if (!userAddress) {
      return NextResponse.json({ success: false, error: 'Adresse requise' }, { status: 400 });
    }

    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const trxPrice = config?.trxUsdPrice || 0.12;

    if (method === 'trx') {
      const amountTrx = amount / trxPrice;
      await db.pendingDeposit.create({
        data: {
          userId: user.id,
          amountUsd: amount,
          amountTrx,
          trxPrice,
          userAddress,
          destination: 'video',
          status: 'pending',
        },
      });
    } else {
      const cfaUsdRate = config?.cfaUsdRate || 600;
      const amountCfa = amount * cfaUsdRate;
      const amountTrx = amount / trxPrice;
      await db.yasDeposit.create({
        data: {
          userId: user.id,
          amountCfa,
          amountUsd: amount,
          amountTrx,
          trxPrice,
          yasAccount: userAddress,
          destination: 'video',
          status: 'pending',
        },
      });
    }

    await db.userNotification.create({
      data: {
        userId: user.id,
        type: 'deposit_pending',
        title: 'Dépôt en cours de traitement',
        message: `Votre demande de dépôt de $${amount.toFixed(2)} sur le compte Vidéo a été prise en compte.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demande de dépôt prise en compte.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}