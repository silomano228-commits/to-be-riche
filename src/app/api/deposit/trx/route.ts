import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTrxPrice, getAdminTrxAddress, getTrxUsdPrice } from '@/lib/trongrid';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  // cookies() is async in Next.js 16
  return null; // Will fallback to cookies below
}

// POST — Crée un dépôt en attente (l'utilisateur entre le montant + son adresse TRX)
export async function POST(request: Request) {
  try {
    let token = getToken(request);
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('br_token')?.value || null;
    }
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { amountUsd, userAddress } = await request.json();
    const amt = parseFloat(amountUsd);
    if (isNaN(amt) || amt < 10) {
      return NextResponse.json({ success: false, error: 'Minimum 10 $' });
    }

    // Prix TRX
    let trxPrice = await getTrxPrice();
    const configPrice = await getTrxUsdPrice();
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

    // userAddress optionnel — si pas fourni, on utilise un placeholder
    const deposit = await db.pendingDeposit.create({
      data: {
        userId: token,
        amountUsd: amt,
        amountTrx,
        trxPrice,
        userAddress: (userAddress || '').trim() || 'Non renseigné',
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

// GET — Info dépôt: adresse admin, prix TRX, dépôt en attente
export async function GET(request: Request) {
  try {
    let token = getToken(request);
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('br_token')?.value || null;
    }
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const adminAddress = await getAdminTrxAddress();
    let trxPrice = await getTrxPrice();
    const configPrice = await getTrxUsdPrice();
    if (configPrice > 0) trxPrice = configPrice;

    const deposit = await db.pendingDeposit.findFirst({
      where: { userId: token, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        adminAddress,
        trxPrice,
        pendingDeposit: deposit ? {
          id: deposit.id,
          amountUsd: deposit.amountUsd,
          amountTrx: deposit.amountTrx,
          userAddress: deposit.userAddress,
          status: deposit.status,
          createdAt: deposit.createdAt,
        } : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
