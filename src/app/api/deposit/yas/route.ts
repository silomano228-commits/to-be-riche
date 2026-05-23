import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTrxPrice, getTrxUsdPrice } from '@/lib/trongrid';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  return null;
}

async function getSiteConfig() {
  return db.siteConfig.findUnique({ where: { id: 'main' } });
}

/**
 * Check if a user has ANY pending deposit (TRX or YAS)
 */
async function getAnyPendingDeposit(userId: string) {
  const pendingTrx = await db.pendingDeposit.findFirst({
    where: { userId, status: 'pending' }
  });
  if (pendingTrx) return { type: 'trx' as const, deposit: pendingTrx };

  const pendingYas = await db.yasDeposit.findFirst({
    where: { userId, status: 'pending' }
  });
  if (pendingYas) return { type: 'yas' as const, deposit: pendingYas };

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

    const { amountCfa, yasAccount, trxAddress } = await request.json();
    const safeTrxAddress = trxAddress?.trim() || '';
    const amtCfa = parseFloat(amountCfa);

    // Get CFA rate from config
    const config = await getSiteConfig();
    const cfaUsdRate = config?.cfaUsdRate || 600;

    if (isNaN(amtCfa) || amtCfa < 6000) {
      return NextResponse.json({ success: false, error: 'Minimum 6 000 FCFA' });
    }
    if (!yasAccount || !yasAccount.trim()) {
      return NextResponse.json({ success: false, error: 'Numéro de compte Yas du Togo requis' });
    }
    // Validate Yas account: 8 digits, starts with 90-93 or 70-73
    const yasNum = yasAccount.trim();
    if (!/^\d{8}$/.test(yasNum)) {
      return NextResponse.json({ success: false, error: 'Le numéro Yas doit contenir exactement 8 chiffres' });
    }
    const prefix = yasNum.substring(0, 2);
    if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
      return NextResponse.json({ success: false, error: 'Le numéro Yas doit commencer par 90-93 ou 70-73' });
    }

    // trxAddress is now optional for YAS deposits

    // Vérifier s'il y a déjà un dépôt en attente (TRX OU YAS)
    const anyPending = await getAnyPendingDeposit(token);
    if (anyPending) {
      const errorMsg = anyPending.type === 'trx'
        ? 'Vous avez déjà un dépôt TRX en attente de confirmation. Attendez qu\'il soit traité avant de faire une nouvelle demande.'
        : 'Vous avez déjà une demande de conversion Yas en attente.';
      return NextResponse.json({ success: false, error: errorMsg });
    }

    // Calculate amounts
    const amountUsd = Math.round((amtCfa / cfaUsdRate) * 100) / 100;

    // Prix TRX
    let trxPrice = await getTrxPrice();
    const configPrice = await getTrxUsdPrice();
    if (configPrice > 0) trxPrice = configPrice;

    const amountTrx = Math.round((amountUsd / trxPrice) * 100) / 100;

    const deposit = await db.yasDeposit.create({
      data: {
        userId: token,
        amountCfa: amtCfa,
        amountUsd,
        amountTrx,
        trxPrice,
        yasAccount: yasAccount.trim(),
        trxAddress: safeTrxAddress || null,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        depositId: deposit.id,
        amountCfa: amtCfa,
        amountTrx: amountTrx.toFixed(2),
        amountUsd,
        trxPrice: trxPrice.toFixed(4),
        cfaUsdRate,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// GET — Info: prix TRX, dépôt Yas en attente, cfaUsdRate, adminYasAccount
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

    // Get site config for cfaUsdRate and adminYasAccount
    const config = await getSiteConfig();
    const cfaUsdRate = config?.cfaUsdRate || 600;
    const adminYasAccount = config?.adminYasAccount || '';

    const deposit = await db.yasDeposit.findFirst({
      where: { userId: token, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    // Also check if user has a pending TRX deposit
    const trxDeposit = await db.pendingDeposit.findFirst({
      where: { userId: token, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    // Get the latest processed deposit
    const lastProcessed = await db.yasDeposit.findFirst({
      where: { userId: token, status: { in: ['approved', 'rejected'] } },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        trxPrice,
        cfaUsdRate,
        adminYasAccount,
        pendingDeposit: deposit ? {
          id: deposit.id,
          amountCfa: deposit.amountCfa,
          amountUsd: deposit.amountUsd,
          amountTrx: deposit.amountTrx,
          yasAccount: deposit.yasAccount,
          trxAddress: deposit.trxAddress,
          status: deposit.status,
          createdAt: deposit.createdAt,
        } : null,
        pendingTrxDeposit: trxDeposit ? {
          id: trxDeposit.id,
          amountUsd: trxDeposit.amountUsd,
          amountTrx: trxDeposit.amountTrx,
          status: trxDeposit.status,
          createdAt: trxDeposit.createdAt,
        } : null,
        lastProcessed: lastProcessed ? {
          id: lastProcessed.id,
          amountCfa: lastProcessed.amountCfa,
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
