import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function checkAdmin(request: Request) {
  const user = await getAuthToken(request);
  if (!user) return { error: NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 }), admin: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin: user };
}

const INVESTMENT_LEVELS: Record<number, { rate: number; label: string }> = {
  1: { rate: 5, label: 'Niveau 1 — Débutant' },
  2: { rate: 5, label: 'Niveau 2 — Business' },
  3: { rate: 5, label: 'Niveau 3 — Elite' },
};

export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const deposits = await db.yasDeposit.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const pending = deposits.filter(d => d.status === 'pending').length;
    const approved = deposits.filter(d => d.status === 'approved').length;
    const rejected = deposits.filter(d => d.status === 'rejected').length;
    const pendingInvestments = deposits.filter(d => d.status === 'pending' && d.type === 'investment').length;

    return NextResponse.json({
      success: true, data: deposits,
      stats: { pending, approved, rejected, total: deposits.length, pendingInvestments },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const { depositId, action, adminNote } = await request.json();

    if (!depositId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides' });
    }

    const deposit = await db.yasDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return NextResponse.json({ success: false, error: 'Demande non trouvée' });
    if (deposit.status !== 'pending') return NextResponse.json({ success: false, error: 'Demande déjà traitée' });

    const isInvestment = deposit.type === 'investment';
    const now = new Date();

    if (action === 'reject') {
      await db.yasDeposit.update({
        where: { id: depositId },
        data: { status: 'rejected', adminNote: adminNote || null, processedAt: now },
      });
      if (isInvestment) {
        await notifyUser({
          userId: deposit.userId, type: 'investment_rejected',
          title: 'Dépôt d\'investissement Yas rejeté',
          message: `Votre demande de dépôt d'investissement de ${deposit.amountCfa.toLocaleString()} FCFA a été rejetée.`,
          link: 'invest',
        });
      } else {
        await notifyUser({
          userId: deposit.userId, type: 'deposit_rejected',
          title: 'Dépôt Yas rejeté',
          message: `Votre dépôt de ${deposit.amountCfa.toLocaleString()} FCFA a été rejeté.`,
          link: 'deposit',
        });
      }
      return NextResponse.json({ success: true, message: 'Demande rejetée' });
    }

    if (isInvestment) {
      const level = deposit.investmentLevel ?? 1;
      const invAmount = deposit.investmentAmount ?? deposit.amountUsd;
      const levelConfig = INVESTMENT_LEVELS[level];
      const rate = levelConfig?.rate ?? 5;
      const levelLabel = levelConfig?.label ?? `Niveau ${level}`;
      const nextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.$transaction(async (tx) => {
        await tx.yasDeposit.update({
          where: { id: depositId },
          data: { status: 'approved', adminNote: adminNote || 'Dépôt investissement approuvé.', processedAt: now },
        });
        await tx.investment.create({
          data: {
            userId: deposit.userId, level, amount: invAmount, rate,
            totalCycles: 0, doneCycles: 0, earned: 0, status: 'active',
            nextClaimAt, finishesAt: null,
          },
        });
        await tx.transaction.create({
          data: {
            type: 'invest_create', amount: -invAmount,
            detail: `Investissement approuvé: ${levelLabel} — $${invAmount.toFixed(2)} à ${rate}%/jour — Paiement YAS`,
            userId: deposit.userId,
          },
        });
      });

      await notifyUser({
        userId: deposit.userId, type: 'investment_approved',
        title: 'Investissement approuvé !',
        message: `Votre dépôt d'investissement ${levelLabel} de ${deposit.amountCfa.toLocaleString()} FCFA (${invAmount.toFixed(2)} $) a été approuvé.`,
        link: 'invest',
      });

      return NextResponse.json({ success: true, message: 'Investissement Yas approuvé — compte à rebours démarré' });
    }

    const depositUser = await db.user.findUnique({ where: { id: deposit.userId } });
    const isFirstDeposit = !depositUser?.hasInvested;

    const balanceField = deposit.destination === 'projectBalance' ? 'projectBalance'
      : deposit.destination === 'investBalance' ? 'investBalance'
      : 'balance';
    const balanceLabel = deposit.destination === 'projectBalance' ? 'compte projet'
      : deposit.destination === 'investBalance' ? 'compte investissement'
      : 'compte principal';

    await db.$transaction(async (tx) => {
      await tx.yasDeposit.update({
        where: { id: depositId },
        data: { status: 'approved', adminNote: adminNote || 'Dépôt validé.', processedAt: now },
      });
      await tx.user.update({
        where: { id: deposit.userId },
        data: {
          [balanceField]: { increment: deposit.amountUsd },
          hasInvested: true,
          depositCount: { increment: 1 },
          firstDepositAt: isFirstDeposit ? new Date() : undefined,
        },
      });
      await tx.transaction.create({
        data: {
          type: 'deposit', amount: deposit.amountUsd,
          detail: `Yas deposit approved: $${deposit.amountUsd.toFixed(2)} credited to ${balanceLabel}`,
          userId: deposit.userId,
        },
      });

      if (isFirstDeposit && depositUser?.referredByCode) {
        const referrer = await tx.user.findUnique({ where: { referralCode: depositUser.referredByCode } });
        if (referrer) {
          const bonusAmount = Math.round(deposit.amountUsd * 0.2 * 100) / 100;
          await tx.user.update({
            where: { id: referrer.id },
            data: { balance: { increment: bonusAmount }, referralCount: { increment: 1 } },
          });
          await tx.transaction.create({
            data: {
              type: 'referral_bonus', amount: bonusAmount,
              detail: `Referral bonus: 20% of parrainé's first Yas deposit ($${deposit.amountUsd.toFixed(2)})`,
              userId: referrer.id,
            },
          });
        }
      }
    });

    await notifyUser({
      userId: deposit.userId, type: 'deposit_approved',
      title: 'Dépôt Yas approuvé !',
      message: `Votre dépôt de ${deposit.amountCfa.toLocaleString()} FCFA (${deposit.amountUsd.toFixed(2)} $) a été approuvé et crédité.`,
      link: 'wallet',
    });

    return NextResponse.json({ success: true, message: 'Dépôt approuvé et solde crédité' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}