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

const VALID_ACCOUNTS = ['principal', 'invest', 'trade', 'project'] as const;
type AccountType = typeof VALID_ACCOUNTS[number];

const ACCOUNT_LABELS: Record<AccountType, string> = {
  principal: 'Compte Principal',
  invest: "Compte d'Investissement",
  trade: 'Compte de Trading',
  project: 'Compte de Projet',
};

const FEE_RATE = 0.02; // 2% fee on transfers TO invest, trade, or project accounts
const MIN_TRANSFER = 2;

function getBalance(user: Record<string, unknown>, account: AccountType): number {
  switch (account) {
    case 'principal': return user.balance as number;
    case 'invest': return user.investBalance as number;
    case 'trade': return user.tradeBalance as number;
    case 'project': return user.projectBalance as number;
  }
}

function getFieldName(account: AccountType): string {
  switch (account) {
    case 'principal': return 'balance';
    case 'invest': return 'investBalance';
    case 'trade': return 'tradeBalance';
    case 'project': return 'projectBalance';
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { from, to, amount } = body;

    if (!from || !to || !amount) {
      return NextResponse.json({ success: false, error: 'Missing fields: from, to, amount' }, { status: 400 });
    }

    if (!VALID_ACCOUNTS.includes(from) || !VALID_ACCOUNTS.includes(to)) {
      return NextResponse.json({ success: false, error: 'Invalid account type. Use "principal", "invest", "trade", or "project".' }, { status: 400 });
    }

    const fromAccount = from as AccountType;
    const toAccount = to as AccountType;

    if (fromAccount === toAccount) {
      return NextResponse.json({ success: false, error: 'Source and destination cannot be the same' }, { status: 400 });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount < MIN_TRANSFER) {
      return NextResponse.json({ success: false, error: `Minimum transfer amount is $${MIN_TRANSFER}` }, { status: 400 });
    }

    // Check source balance
    const sourceBalance = getBalance(user, fromAccount);
    if (sourceBalance < transferAmount) {
      return NextResponse.json({ success: false, error: `Insufficient balance in ${ACCOUNT_LABELS[fromAccount]}. Have $${sourceBalance.toFixed(2)}` }, { status: 400 });
    }

    // Calculate fee for transfers TO invest, trade, or project accounts (not back to principal)
    let fee = 0;
    let receivedAmount = transferAmount;
    if (toAccount !== 'principal') {
      fee = Math.round(transferAmount * FEE_RATE * 100) / 100;
      receivedAmount = Math.round((transferAmount - fee) * 100) / 100;
    }

    // Perform the transfer
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
      },
      message: `Transferred $${transferAmount.toFixed(2)} from ${ACCOUNT_LABELS[fromAccount]} to ${ACCOUNT_LABELS[toAccount]}${fee > 0 ? ` (fee: $${fee.toFixed(2)})` : ''}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
