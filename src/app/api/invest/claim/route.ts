import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { validatePaymentAddress } from '@/lib/payment';
import { notifyAdmin } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const MIN_YAS_TRX_PAYOUT = 5;

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { investmentId, payoutMethod, userAddress } = body;

    if (!investmentId) {
      return NextResponse.json({ success: false, error: 'ID d\'investissement requis' }, { status: 400 });
    }

    const method: 'yas_trx' | 'main' = payoutMethod === 'yas_trx' ? 'yas_trx' : 'main';

    const investment = await db.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment || investment.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Investissement introuvable' }, { status: 404 });
    }

    if (investment.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Investissement inactif' }, { status: 400 });
    }

    if (investment.level >= 2 && user.referralCount < 12) {
      return NextResponse.json({
        success: false,
        error: 'Vous devez avoir au moins 12 parrainages pour récolter les gains de ce niveau d\'investissement',
      }, { status: 400 });
    }

    const now = new Date();

    if (investment.nextClaimAt && now < investment.nextClaimAt) {
      const remaining = investment.nextClaimAt.getTime() - now.getTime();
      const hoursLeft = Math.ceil(remaining / (60 * 60 * 1000));
      return NextResponse.json({
        success: false,
        error: `Collecte pas encore disponible. ${hoursLeft} heure(s) restante(s).`,
      }, { status: 400 });
    }

    const gain = Math.round(investment.amount * investment.rate / 100 * 100) / 100;
    const newDoneCycles = investment.doneCycles + 1;
    const newEarned = Math.round((investment.earned + gain) * 100) / 100;
    const newNextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const isUnlimited = investment.totalCycles === 0;
    const isCompleted = !isUnlimited && newDoneCycles >= investment.totalCycles;

    if (method === 'yas_trx') {
      if (gain < MIN_YAS_TRX_PAYOUT) {
        return NextResponse.json({
          success: false,
          error: `Pour retirer directement via YAS/TRX, le gain minimum est de $${MIN_YAS_TRX_PAYOUT}.`,
          gainTooSmall: true,
          gain,
          minRequired: MIN_YAS_TRX_PAYOUT,
        }, { status: 400 });
      }
      if (!userAddress || !userAddress.trim()) {
        return NextResponse.json({ success: false, error: 'Adresse de retrait requise (TRX ou YAS).' }, { status: 400 });
      }
      const paymentType: 'yas' | 'trx' = body.paymentType === 'yas' ? 'yas' : 'trx';
      const addressErr = validatePaymentAddress(paymentType, userAddress);
      if (addressErr) {
        return NextResponse.json({ success: false, error: addressErr }, { status: 400 });
      }
    }

    const siteConfig = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = siteConfig?.cfaUsdRate || 600;

    const withdrawalNotify: Array<{ id: string; isTrx: boolean }> = [];

    await db.$transaction(async (tx) => {
      await tx.investment.update({
        where: { id: investmentId },
        data: {
          doneCycles: newDoneCycles,
          earned: newEarned,
          lastClaimAt: now,
          nextClaimAt: isCompleted ? null : newNextClaimAt,
          status: isCompleted ? 'completed' : 'active',
          finishesAt: isCompleted ? now : investment.finishesAt,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          totalProfit: { increment: gain },
          totalInvestClaims: { increment: 1 },
        },
      });

      if (method === 'main') {
        await tx.user.update({
          where: { id: user.id },
          data: { investBalance: { increment: gain } },
        });
        await tx.transaction.create({
          data: {
            type: 'invest_claim',
            amount: gain,
            detail: `Collecte journalière — compte investissement — Niveau ${investment.level}: +$${gain.toFixed(2)} — Cycle ${newDoneCycles}${isUnlimited ? ' (illimité)' : `/${investment.totalCycles}`}`,
            userId: user.id,
          },
        });
      } else {
        const amountCfa = gain * cfaUsdRate;
        const isTrx = body.paymentType === 'trx';
        const withdrawal = await tx.withdrawal.create({
          data: {
            userId: user.id,
            amount: gain,
            amountCfa,
            type: isTrx ? 'invest_trx' : 'invest_yas',
            trxAddress: isTrx ? userAddress.trim() : null,
            yasAccount: isTrx ? null : userAddress.trim(),
            status: 'pending',
          },
        });
        await tx.transaction.create({
          data: {
            type: 'invest_claim_withdraw',
            amount: gain,
            detail: `Collecte investissement Niveau ${investment.level}: $${gain.toFixed(2)} — Retrait ${isTrx ? 'TRX' : 'YAS'} demandé (en attente) — Cycle ${newDoneCycles}`,
            userId: user.id,
          },
        });
        await tx.userNotification.create({
          data: {
            userId: user.id,
            type: 'withdrawal_pending',
            title: 'Retrait en attente d\'approbation',
            message: `Votre collecte de $${gain.toFixed(2)} a été initiée.`,
            link: 'wallet',
          },
        });
        withdrawalNotify.push({ id: withdrawal.id, isTrx });
      }

      if (user.referredByCode) {
        const admin = await tx.user.findFirst({ where: { role: 'admin' } });
        if (admin) {
          const adminBonus = Math.round(gain * 0.05 * 100) / 100;
          if (adminBonus > 0) {
            await tx.user.update({
              where: { id: admin.id },
              data: { balance: { increment: adminBonus } },
            });
            await tx.transaction.create({
              data: {
                type: 'referral_invest_bonus',
                amount: adminBonus,
                detail: `5% de la collecte du parrainé ($${gain.toFixed(2)})`,
                userId: admin.id,
              },
            });
          }
        }
      }
    });

    if (withdrawalNotify.length > 0) {
      const wn = withdrawalNotify[0];
      await notifyAdmin({
        type: 'investment_withdrawal_request',
        title: 'Nouvelle demande de retrait d\'investissement',
        message: `${user.name} a demandé un retrait de $${gain.toFixed(2)} (${wn.isTrx ? 'TRX' : 'YAS'}) — en attente d'approbation.`,
        userId: user.id,
        withdrawalId: wn.id,
      });
    }

    const payoutLabel = method === 'main'
      ? `versé sur votre compte d'investissement`
      : `retrait demandé (fonds disponibles dans les 6h)`;

    return NextResponse.json({
      success: true,
      gain,
      doneCycles: newDoneCycles,
      totalCycles: investment.totalCycles,
      unlimited: isUnlimited,
      completed: isCompleted,
      payoutMethod: method,
      message: `Collecte de $${gain.toFixed(2)} réussie ! ${payoutLabel.charAt(0).toUpperCase() + payoutLabel.slice(1)}. Cycle ${newDoneCycles}${isUnlimited ? ' (illimité)' : `/${investment.totalCycles}`}.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}