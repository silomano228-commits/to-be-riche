import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_ACCOUNTS = ['principal', 'invest', 'project'] as const;
type AccountType = typeof VALID_ACCOUNTS[number];

const ACCOUNT_LABELS: Record<AccountType, string> = {
  principal: 'Compte Principal',
  invest: "Compte d'Investissement",
  project: 'Compte de Projet',
};

const FEE_RATE = 0.02;
const MIN_TRANSFER = 2;
const HOLD_DAYS = 10;
const LEVEL_2_REFERRAL_REQUIREMENT = 12;
const MAX_TRANSFER = 50000;

function getBalance(user: Record<string, unknown>, account: AccountType): number {
  switch (account) {
    case 'principal': return user.balance as number;
    case 'invest': return user.investBalance as number;
    case 'project': return user.projectBalance as number;
  }
}

function getFieldName(account: AccountType): string {
  switch (account) {
    case 'principal': return 'balance';
    case 'invest': return 'investBalance';
    case 'project': return 'projectBalance';
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { from, to, amount } = body;

    if (!from || !to || !amount) {
      return NextResponse.json({ success: false, error: 'Missing fields: from, to, amount' }, { status: 400 });
    }

    if (!VALID_ACCOUNTS.includes(from) || !VALID_ACCOUNTS.includes(to)) {
      return NextResponse.json({ success: false, error: 'Invalid account type. Use "principal", "invest", or "project".' }, { status: 400 });
    }

    const fromAccount = from as AccountType;
    const toAccount = to as AccountType;

    if (fromAccount === toAccount) {
      return NextResponse.json({ success: false, error: 'Source and destination cannot be the same' }, { status: 400 });
    }

    if (fromAccount === 'principal' && toAccount === 'invest') {
      return NextResponse.json({
        success: false,
        error: 'Les dépôts se font directement dans les niveaux d\'investissement',
      }, { status: 400 });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount < MIN_TRANSFER) {
      return NextResponse.json({ success: false, error: `Minimum transfer amount is $${MIN_TRANSFER}` }, { status: 400 });
    }
    if (transferAmount > MAX_TRANSFER) {
      return NextResponse.json({ success: false, error: `Maximum transfer amount is $${MAX_TRANSFER}` }, { status: 400 });
    }

    // Re-read user fresh to prevent TOCTOU race condition
    const freshUser = await db.user.findUnique({ where: { id: user.id } });
    if (!freshUser) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const sourceBalance = getBalance(freshUser, fromAccount);
    if (sourceBalance < transferAmount) {
      return NextResponse.json({ success: false, error: `Insufficient balance in ${ACCOUNT_LABELS[fromAccount]}. Have $${sourceBalance.toFixed(2)}` }, { status: 400 });
    }

    let fee = 0;
    let receivedAmount = transferAmount;
    if (fromAccount === 'principal') {
      fee = Math.round(transferAmount * FEE_RATE * 100) / 100;
      receivedAmount = Math.round((transferAmount - fee) * 100) / 100;
    }

    if (fromAccount === 'invest' && toAccount === 'principal') {
      const level2PlusInvestment = await db.investment.findFirst({
        where: { userId: user.id, level: { gte: 2 }, status: 'active' },
      });

      if (level2PlusInvestment && freshUser.referralCount < LEVEL_2_REFERRAL_REQUIREMENT) {
        const releaseAt = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000);
        await db.$transaction([
          db.user.update({
            where: { id: user.id },
            data: {
              investBalance: { decrement: transferAmount },
              heldInvestBalance: { increment: transferAmount },
              heldReleaseAt: releaseAt,
            },
          }),
          db.transaction.create({
            data: {
              type: 'transfer_hold',
              amount: -transferAmount,
              detail: `Fonds en attente de débloquage — disponible dans ${HOLD_DAYS} jours (transfert investissement → principal)`,
              userId: user.id,
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          transfer: {
            from: fromAccount,
            to: toAccount,
            amount: transferAmount,
            fee: 0,
            received: transferAmount,
            held: true,
            releaseAt: releaseAt.toISOString(),
          },
          message: 'Transfert en cours. Les fonds seront disponibles sur votre compte principal sous 10 jours.',
        });
      }
    }

    const updateData: Record<string, { decrement: number } | { increment: number }> = {};
    updateData[getFieldName(fromAccount)] = { decrement: transferAmount };
    updateData[getFieldName(toAccount)] = { increment: receivedAmount };

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: updateData,
      }),
      db.transaction.create({
        data: {
          type: 'transfer',
          amount: -transferAmount,
          detail: `Transfer $${transferAmount.toFixed(2)} from ${ACCOUNT_LABELS[fromAccount]} to ${ACCOUNT_LABELS[toAccount]}${fee > 0 ? ` (fee: $${fee.toFixed(2)}, received: $${receivedAmount.toFixed(2)})` : ''}`,
          userId: user.id,
        },
      }),
      ...(fee > 0 ? [db.transaction.create({
        data: {
          type: 'transfer_fee',
          amount: -fee,
          detail: `2% transfer fee on $${transferAmount.toFixed(2)} transfer to ${ACCOUNT_LABELS[toAccount]}`,
          userId: user.id,
        },
      })] : []),
    ]);

    return NextResponse.json({
      success: true,
      transfer: {
        from: fromAccount,
        to: toAccount,
        amount: transferAmount,
        fee,
        received: receivedAmount,
        held: false,
      },
      message: `Transferred $${transferAmount.toFixed(2)} from ${ACCOUNT_LABELS[fromAccount]} to ${ACCOUNT_LABELS[toAccount]}${fee > 0 ? ` (fee: $${fee.toFixed(2)})` : ''}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}