import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTrxPrice, getAdminTrxAddress, getTrxUsdPrice } from '@/lib/trongrid';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  return null;
}

/**
 * Check if a user has ANY pending deposit (TRX or YAS)
 * Returns the pending deposit info or null
 */
async function getAnyPendingDeposit(userId: string) {
  // Check TRX pending
  const pendingTrx = await db.pendingDeposit.findFirst({
    where: { userId, status: 'pending' }
  });
  if (pendingTrx) return { type: 'trx' as const, deposit: pendingTrx };

  // Check YAS pending
  const pendingYas = await db.yasDeposit.findFirst({
    where: { userId, status: 'pending' }
  });
  if (pendingYas) return { type: 'yas' as const, deposit: pendingYas };

  return null;
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

    // Vérifier s'il y a déjà un dépôt en attente (TRX OU YAS)
    const anyPending = await getAnyPendingDeposit(token);
    if (anyPending) {
      const errorMsg = anyPending.type === 'trx'
        ? 'Vous avez déjà un dépôt TRX en attente de confirmation.'
        : 'Vous avez déjà une demande de conversion Yas en attente. Attendez qu\'elle soit traitée avant de faire un nouveau dépôt.';
      return NextResponse.json({ success: false, error: errorMsg });
    }

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

    // Also check if user has a pending YAS deposit
    const yasDeposit = await db.yasDeposit.findFirst({
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
        pendingYasDeposit: yasDeposit ? {
          id: yasDeposit.id,
          amountCfa: yasDeposit.amountCfa,
          amountUsd: yasDeposit.amountUsd,
          amountTrx: yasDeposit.amountTrx,
          yasAccount: yasDeposit.yasAccount,
          trxAddress: yasDeposit.trxAddress,
          status: yasDeposit.status,
          createdAt: yasDeposit.createdAt,
        } : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
