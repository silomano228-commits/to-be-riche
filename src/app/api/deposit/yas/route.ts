import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { notifyAdmin, notifyUser } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { getTrxPrice, getTrxUsdPrice } from '@/lib/trongrid';
import { ensureSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

const MAX_DEPOSIT = 50000;

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

// POST — Crée une demande de dépôt Yas
export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { amountCfa, yasAccount, trxAddress, destination: destParam, targetAccount } = await request.json();
    const amtCfa = parseFloat(amountCfa);
    const safeDestination = targetAccount === 'jeu' ? 'balance'
      : targetAccount === 'projet' ? 'projectBalance'
      : targetAccount === 'invest' ? 'investBalance'
      : (destParam || 'balance');

    const config = await ensureSiteConfig();
    const cfaUsdRate = config.cfaUsdRate || 600;

    if (isNaN(amtCfa) || !isFinite(amtCfa) || amtCfa < 3000) {
      return NextResponse.json({ success: false, error: 'Minimum 3 000 FCFA' });
    }
    const amountUsd = Math.round((amtCfa / cfaUsdRate) * 100) / 100;
    if (amountUsd > 50000) {
      return NextResponse.json({ success: false, error: 'Maximum de dépôt: 30 000 000 FCFA' });
    }
    if (!yasAccount || !yasAccount.trim()) {
      return NextResponse.json({ success: false, error: 'Numéro de compte Yas du Togo requis' });
    }
    const yasNum = yasAccount.trim();
    if (!/^\d{8}$/.test(yasNum)) {
      return NextResponse.json({ success: false, error: 'Le numéro Yas doit contenir exactement 8 chiffres' });
    }
    const prefix = yasNum.substring(0, 2);
    if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
      return NextResponse.json({ success: false, error: 'Le numéro Yas doit commencer par 90-93 ou 70-73' });
    }

    const anyPending = await getAnyPendingDeposit(user.id);
    if (anyPending) {
      const errorMsg = anyPending.type === 'trx'
        ? 'Vous avez déjà un dépôt TRX en attente de confirmation. Attendez qu\'il soit traité avant de faire une nouvelle demande.'
        : 'Vous avez déjà une demande de dépôt Yas en attente.';
      return NextResponse.json({ success: false, error: errorMsg });
    }

    let trxPrice = await getTrxPrice();
    const configPrice = await getTrxUsdPrice();
    if (configPrice > 0) trxPrice = configPrice;

    const amountTrx = Math.round((amountUsd / trxPrice) * 100) / 100;

    const deposit = await db.yasDeposit.create({
      data: {
        userId: user.id,
        amountCfa: amtCfa,
        amountUsd,
        amountTrx,
        trxPrice,
        yasAccount: yasAccount.trim(),
        trxAddress: null,
        destination: safeDestination,
        status: 'pending',
      },
    });

    await notifyAdmin({
      type: 'new_deposit',
      title: 'Nouveau dépôt Yas',
      message: `${user.name} demande un dépôt de ${amtCfa.toLocaleString()} FCFA (${amountUsd.toFixed(2)} $) via Yas`,
      userId: user.id,
    });

    await notifyUser({
      userId: user.id,
      type: 'deposit_pending',
      title: 'Demande de dépôt prise en compte',
      message: 'Votre demande de dépôt a été prise en compte. Elle sera vérifiée prochainement.',
      link: 'wallet',
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
        destination: safeDestination,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET — Info: prix TRX, dépôt Yas en attente, cfaUsdRate, adminYasAccount
export async function GET(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    let trxPrice = await getTrxPrice();
    const configPrice = await getTrxUsdPrice();
    if (configPrice > 0) trxPrice = configPrice;

    const config = await ensureSiteConfig();
    const cfaUsdRate = config.cfaUsdRate || 600;
    const adminYasAccount = config.adminYasAccount;

    const deposit = await db.yasDeposit.findFirst({
      where: { userId: user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const trxDeposit = await db.pendingDeposit.findFirst({
      where: { userId: user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const lastProcessed = await db.yasDeposit.findFirst({
      where: { userId: user.id, status: { in: ['approved', 'rejected'] } },
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
          destination: deposit.destination,
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
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}