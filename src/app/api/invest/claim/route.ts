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

const MIN_YAS_TRX_PAYOUT = 5; // Minimum $5 to withdraw directly via YAS/TRX

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { investmentId, payoutMethod, userAddress } = body;

    if (!investmentId) {
      return NextResponse.json({ success: false, error: 'ID d\'investissement requis' }, { status: 400 });
    }

    // payoutMethod: 'yas_trx' (withdraw directly, min $5) or 'main' (credit main account)
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

    const now = new Date();

    // Check 24h cooldown
    if (investment.nextClaimAt && now < investment.nextClaimAt) {
      const remaining = investment.nextClaimAt.getTime() - now.getTime();
      const hoursLeft = Math.ceil(remaining / (60 * 60 * 1000));
      return NextResponse.json({
        success: false,
        error: `Collecte pas encore disponible. ${hoursLeft} heure(s) restante(s).`,
      }, { status: 400 });
    }

    // Calculate gain (rate% of investment amount)
    const gain = Math.round(investment.amount * investment.rate / 100 * 100) / 100;
    const newDoneCycles = investment.doneCycles + 1;
    const newEarned = Math.round((investment.earned + gain) * 100) / 100;
    const newNextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const newTotalClaims = user.totalInvestClaims + 1;

    // UNLIMITED cycles: totalCycles = 0 means unlimited, never completes.
    // For legacy investments with totalCycles > 0, respect the cap.
    const isUnlimited = investment.totalCycles === 0;
    const isCompleted = !isUnlimited && newDoneCycles >= investment.totalCycles;

    // If withdrawing directly via YAS/TRX, require minimum $5 and an address
    if (method === 'yas_trx') {
      if (gain < MIN_YAS_TRX_PAYOUT) {
        return NextResponse.json({
          success: false,
          error: `Pour retirer directement via YAS/TRX, le gain minimum est de $${MIN_YAS_TRX_PAYOUT}. Votre gain est de $${gain.toFixed(2)}. Choisissez "Verser sur le compte principal" à la place.`,
          gainTooSmall: true,
          gain,
          minRequired: MIN_YAS_TRX_PAYOUT,
        }, { status: 400 });
      }
      if (!userAddress || !userAddress.trim()) {
        return NextResponse.json({ success: false, error: 'Adresse de retrait requise (TRX ou YAS).' }, { status: 400 });
      }
    }

    const siteConfig = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = siteConfig?.cfaUsdRate || 600;

    await db.$transaction(async (tx) => {
      // Update investment: unlimited never completes
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
        // Credit the main account directly (no minimum)
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: gain } },
        });
        await tx.transaction.create({
          data: {
            type: 'invest_claim',
            amount: gain,
            detail: `Collecte investissement Niveau ${investment.level}: +$${gain.toFixed(2)} versé sur le compte principal — Cycle ${newDoneCycles}${isUnlimited ? ' (illimité)' : `/${investment.totalCycles}`}`,
            userId: user.id,
          },
        });
      } else {
        // Create a withdrawal record (pending). Funds available within 6 hours.
        const amountCfa = gain * cfaUsdRate;
        const isTrx = body.paymentType === 'trx'; // 'trx' or 'yas'
        await tx.withdrawal.create({
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
            detail: `Collecte investissement Niveau ${investment.level}: $${gain.toFixed(2)} — Retrait ${isTrx ? 'TRX' : 'YAS'} demandé (fonds disponibles dans les 6h) — Cycle ${newDoneCycles}${isUnlimited ? ' (illimité)' : `/${investment.totalCycles}`}`,
            userId: user.id,
          },
        });
        await tx.userNotification.create({
          data: {
            userId: user.id,
            type: 'withdrawal_pending',
            title: 'Retrait en cours de traitement',
            message: `Votre collecte de $${gain.toFixed(2)} a été initiée. Les fonds seront disponibles dans les 6 heures.`,
          },
        });
      }

      // 5% of parrainé's investment gains to admin
      if (user.referredByCode) {
        const admin = await tx.user.findFirst({
          where: { role: 'admin' },
        });
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

    const payoutLabel = method === 'main'
      ? `versé sur votre compte principal`
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
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
