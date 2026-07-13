import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
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

async function checkAdmin(request: Request) {
  const token = getToken(request);
  if (!token) return { error: NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 }), admin: null };
  const admin = await db.user.findUnique({ where: { id: token } });
  if (!admin || admin.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin };
}

// Investment levels — mirror of /api/invest/create. Used when approving an
// investment-type deposit to create the Investment record with the correct
// rate. totalCycles = 0 means UNLIMITED collection days.
const INVESTMENT_LEVELS: Record<number, { rate: number; label: string }> = {
  1: { rate: 5, label: 'Niveau 1 — Débutant' },
  2: { rate: 5, label: 'Niveau 2 — Business' },
  3: { rate: 5, label: 'Niveau 3 — Elite' },
};

// GET — Liste tous les dépôts en attente (admin)
export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const deposits = await db.pendingDeposit.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const pending = deposits.filter(d => d.status === 'pending').length;
    const approved = deposits.filter(d => d.status === 'approved').length;
    const rejected = deposits.filter(d => d.status === 'rejected').length;
    // Count of investment-type deposits (so the admin badge can highlight them)
    const pendingInvestments = deposits.filter(d => d.status === 'pending' && d.type === 'investment').length;

    return NextResponse.json({
      success: true,
      data: deposits,
      stats: { pending, approved, rejected, total: deposits.length, pendingInvestments },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST — Approuver ou rejeter un dépôt (admin)
// When the deposit has type='investment', approval creates the actual
// Investment record with the countdown starting NOW (nextClaimAt = +24h,
// finishesAt = null for unlimited cycles). The user's principal balance is
// NOT credited — the funds are invested directly.
export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const { depositId, action, txHash } = await request.json();

    if (!depositId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides' });
    }

    const deposit = await db.pendingDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return NextResponse.json({ success: false, error: 'Dépôt non trouvé' });
    if (deposit.status !== 'pending') return NextResponse.json({ success: false, error: 'Dépôt déjà traité' });

    const isInvestment = deposit.type === 'investment';
    const now = new Date();

    if (action === 'reject') {
      await db.pendingDeposit.update({
        where: { id: depositId },
        data: { status: 'rejected', processedAt: now },
      });
      // Notify user
      if (isInvestment) {
        await notifyUser({
          userId: deposit.userId,
          type: 'investment_rejected',
          title: 'Dépôt d\'investissement rejeté',
          message: `Votre demande de dépôt d'investissement de ${deposit.amountUsd.toFixed(2)} $ a été rejetée par l'administrateur. Aucun fonds n'a été débité. Actualisez votre page régulièrement pour voir votre solde à jour.`,
          link: 'invest',
        });
      } else {
        await notifyUser({
          userId: deposit.userId,
          type: 'deposit_rejected',
          title: 'Dépôt rejeté',
          message: `Votre dépôt de ${deposit.amountUsd.toFixed(2)} $ a été rejeté. Actualisez votre page régulièrement pour voir votre solde à jour.`,
          link: 'deposit',
        });
      }
      return NextResponse.json({ success: true, message: 'Dépôt rejeté' });
    }

    // ============ APPROVE ============
    if (isInvestment) {
      // Investment-type deposit: create the Investment record now.
      // The countdown starts at approval time (NOT at request time).
      const level = deposit.investmentLevel ?? 1;
      const invAmount = deposit.investmentAmount ?? deposit.amountUsd;
      const levelConfig = INVESTMENT_LEVELS[level];
      const rate = levelConfig?.rate ?? 5;
      const levelLabel = levelConfig?.label ?? `Niveau ${level}`;

      // nextClaimAt = 24h from now. totalCycles = 0 means UNLIMITED.
      const nextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.$transaction(async (tx) => {
        await tx.pendingDeposit.update({
          where: { id: depositId },
          data: { status: 'approved', txHash: txHash || null, processedAt: now },
        });

        await tx.investment.create({
          data: {
            userId: deposit.userId,
            level,
            amount: invAmount,
            rate,
            totalCycles: 0, // 0 = unlimited
            doneCycles: 0,
            earned: 0,
            status: 'active',
            nextClaimAt,
            finishesAt: null, // never finishes (unlimited)
          },
        });

        await tx.transaction.create({
          data: {
            type: 'invest_create',
            amount: -invAmount,
            detail: `Investissement approuvé: ${levelLabel} — $${invAmount.toFixed(2)} à ${rate}%/jour (collecte illimitée) — Paiement TRX — Compte à rebours démarré`,
            userId: deposit.userId,
          },
        });
      });

      // Notify user that investment is now active and countdown has started
      await notifyUser({
        userId: deposit.userId,
        type: 'investment_approved',
        title: 'Investissement approuvé !',
        message: `Votre dépôt d'investissement ${levelLabel} de ${invAmount.toFixed(2)} $ a été approuvé. Votre investissement a été activé. Le compte à rebours de 24h a démarré — vous pourrez collecter vos premiers gains demain. Actualisez votre page régulièrement pour voir votre solde à jour.`,
        link: 'invest',
      });

      return NextResponse.json({ success: true, message: 'Investissement approuvé — compte à rebours démarré' });
    }

    // ---------- Standard principal-wallet deposit (existing behavior) ----------
    const depositUser = await db.user.findUnique({ where: { id: deposit.userId } });
    const isFirstDeposit = !depositUser?.hasInvested;

    // Determine which balance to credit based on destination
    const balanceField = deposit.destination === 'projectBalance' ? 'projectBalance'
      : deposit.destination === 'investBalance' ? 'investBalance'
      : 'balance';
    const balanceLabel = deposit.destination === 'projectBalance' ? 'compte projet'
      : deposit.destination === 'investBalance' ? 'compte investissement'
      : 'compte principal';

    await db.$transaction(async (tx) => {
      await tx.pendingDeposit.update({
        where: { id: depositId },
        data: { status: 'approved', txHash: txHash || null, processedAt: now },
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
          type: 'deposit',
          amount: deposit.amountUsd,
          detail: `Deposit approved: $${deposit.amountUsd.toFixed(2)} credited to ${balanceLabel}`,
          userId: deposit.userId,
        },
      });

      // 20% referral bonus on parrainé's first deposit
      if (isFirstDeposit && depositUser?.referredByCode) {
        const referrer = await tx.user.findUnique({
          where: { referralCode: depositUser.referredByCode },
        });
        if (referrer) {
          const bonusAmount = Math.round(deposit.amountUsd * 0.2 * 100) / 100;
          await tx.user.update({
            where: { id: referrer.id },
            data: {
              balance: { increment: bonusAmount },
              referralCount: { increment: 1 },
            },
          });
          await tx.transaction.create({
            data: {
              type: 'referral_bonus',
              amount: bonusAmount,
              detail: `Referral bonus: 20% of parrainé's first deposit ($${deposit.amountUsd.toFixed(2)})`,
              userId: referrer.id,
            },
          });
        }
      }
    });

    // Notify user
    await notifyUser({
      userId: deposit.userId,
      type: 'deposit_approved',
      title: 'Dépôt approuvé !',
      message: `Votre dépôt de ${deposit.amountUsd.toFixed(2)} $ a été approuvé et crédité. Actualisez votre page régulièrement pour voir votre solde à jour.`,
      link: 'wallet',
    });

    return NextResponse.json({ success: true, message: `Dépôt approuvé et crédité au ${balanceLabel}` });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}