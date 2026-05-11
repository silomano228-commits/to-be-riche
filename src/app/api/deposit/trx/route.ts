import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTrxPrice, getAdminTrxAddress } from '@/lib/trongrid';

// POST — Crée un dépôt en attente (l'utilisateur entre le montant + son adresse TRX)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { amountUsd, userAddress } = await request.json();
    const amt = parseFloat(amountUsd);
    if (isNaN(amt) || amt < 10) {
      return NextResponse.json({ success: false, error: 'Minimum 10 $' });
    }

    if (!userAddress || typeof userAddress !== 'string' || userAddress.length < 20) {
      return NextResponse.json({ success: false, error: 'Adresse TRX invalide' });
    }

    // Prix TRX
    let trxPrice = await getTrxPrice();
    const configPrice = await (await import('@/lib/trongrid')).getTrxUsdPrice();
    if (configPrice > 0) trxPrice = configPrice;

    const amountTrx = Math.round((amt / trxPrice) * 100) / 100;
    const adminAddress = await getAdminTrxAddress();

    if (!adminAddress) {
      return NextResponse.json({ success: false, error: 'Paiement TRX non configuré. Contactez l\'administrateur.' });
    }

    // Vérifier s'il y a déjà un dépôt en attente
    const existingPending = await db.pendingDeposit.findFirst({
      where: { userId: token, status: 'pending' }
    });
    if (existingPending) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà un dépôt en attente de confirmation.' });
    }

    const deposit = await db.pendingDeposit.create({
      data: {
        userId: token,
        amountUsd: amt,
        amountTrx,
        trxPrice,
        userAddress: userAddress.trim(),
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        depositId: deposit.id,
        adminAddress,
        amountTrx: amountTrx.toFixed(2),
        amountUsd: amt,
        trxPrice: trxPrice.toFixed(4),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// GET — Statut du dépôt en attente de l'utilisateur
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const deposit = await db.pendingDeposit.findFirst({
      where: { userId: token, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    if (!deposit) {
      return NextResponse.json({ success: true, data: null });
    }

    const adminAddress = await getAdminTrxAddress();

    return NextResponse.json({
      success: true,
      data: {
        id: deposit.id,
        amountUsd: deposit.amountUsd,
        amountTrx: deposit.amountTrx,
        userAddress: deposit.userAddress,
        adminAddress,
        status: deposit.status,
        createdAt: deposit.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
