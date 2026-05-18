import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTrxPrice, getTrxUsdPrice } from '@/lib/trongrid';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  return null;
}

// POST — Crée une demande de conversion Yas du Togo
export async function POST(request: Request) {
  try {
    let token = getToken(request);
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('br_token')?.value || null;
    }
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { amountUsd, yasAccount, trxAddress } = await request.json();
    const amt = parseFloat(amountUsd);
    if (isNaN(amt) || amt < 10) {
      return NextResponse.json({ success: false, error: 'Minimum 10 $' });
    }
    if (!yasAccount || !yasAccount.trim()) {
      return NextResponse.json({ success: false, error: 'Numéro de compte Yas du Togo requis' });
    }
    if (!trxAddress || !trxAddress.trim()) {
      return NextResponse.json({ success: false, error: 'Adresse TRX Trust Wallet requise' });
    }

    // Prix TRX
    let trxPrice = await getTrxPrice();
    const configPrice = await getTrxUsdPrice();
    if (configPrice > 0) trxPrice = configPrice;

    const amountTrx = Math.round((amt / trxPrice) * 100) / 100;

    // Vérifier s'il y a déjà une demande en attente
    const existingPending = await db.yasDeposit.findFirst({
      where: { userId: token, status: 'pending' }
    });
    if (existingPending) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de conversion en attente.' });
    }

    const deposit = await db.yasDeposit.create({
      data: {
        userId: token,
        amountUsd: amt,
        amountTrx,
        trxPrice,
        yasAccount: yasAccount.trim(),
        trxAddress: trxAddress.trim(),
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        depositId: deposit.id,
        amountTrx: amountTrx.toFixed(2),
        amountUsd: amt,
        trxPrice: trxPrice.toFixed(4),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// GET — Info: prix TRX, dépôt Yas en attente
export async function GET(request: Request) {
  try {
    let token = getToken(request);
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('br_token')?.value || null;
    }
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    let trxPrice = await getTrxPrice();
    const configPrice = await getTrxUsdPrice();
    if (configPrice > 0) trxPrice = configPrice;

    const deposit = await db.yasDeposit.findFirst({
      where: { userId: token, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    // Also get the latest processed deposit
    const lastProcessed = await db.yasDeposit.findFirst({
      where: { userId: token, status: { in: ['approved', 'rejected'] } },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        trxPrice,
        pendingDeposit: deposit ? {
          id: deposit.id,
          amountUsd: deposit.amountUsd,
          amountTrx: deposit.amountTrx,
          yasAccount: deposit.yasAccount,
          trxAddress: deposit.trxAddress,
          status: deposit.status,
          createdAt: deposit.createdAt,
        } : null,
        lastProcessed: lastProcessed ? {
          id: lastProcessed.id,
          amountUsd: lastProcessed.amountUsd,
          status: lastProcessed.status,
          adminNote: lastProcessed.adminNote,
          updatedAt: lastProcessed.updatedAt,
        } : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
