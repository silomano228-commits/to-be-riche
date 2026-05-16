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

const FEE_RATE = 0.02; // 2% fee on transfers TO invest account
const MIN_TRANSFER = 2;

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

    if (!['principal', 'invest'].includes(from) || !['principal', 'invest'].includes(to)) {
      return NextResponse.json({ success: false, error: 'Invalid account type. Use "principal" or "invest".' }, { status: 400 });
    }

    if (from === to) {
      return NextResponse.json({ success: false, error: 'Source and destination cannot be the same' }, { status: 400 });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount < MIN_TRANSFER) {
      return NextResponse.json({ success: false, error: `Minimum transfer amount is $${MIN_TRANSFER}` }, { status: 400 });
    }

    // Check source balance
    const sourceBalance = from === 'principal' ? user.balance : user.investBalance;
    if (sourceBalance < transferAmount) {
      return NextResponse.json({ success: false, error: `Insufficient balance in ${from} account. Have $${sourceBalance.toFixed(2)}` }, { status: 400 });
    }

    // Calculate fee for transfers TO invest account
    let fee = 0;
    let receivedAmount = transferAmount;
    if (to === 'invest') {
      fee = Math.round(transferAmount * FEE_RATE * 100) / 100;
      receivedAmount = Math.round((transferAmount - fee) * 100) / 100;
    }

    // Perform the transfer
    const updateData: Record<string, { decrement: number } | { increment: number }> = {};

    if (from === 'principal') {
      updateData.balance = { decrement: transferAmount };
    } else {
      updateData.investBalance = { decrement: transferAmount };
    }

    if (to === 'principal') {
      updateData.balance = { increment: transferAmount };
    } else {
      updateData.investBalance = { increment: receivedAmount };
    }

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: updateData,
      }),
      db.transaction.create({
        data: {
          type: 'transfer',
          amount: -transferAmount,
          detail: `Transfer $${transferAmount.toFixed(2)} from ${from} to ${to}${fee > 0 ? ` (fee: $${fee.toFixed(2)}, received: $${receivedAmount.toFixed(2)})` : ''}`,
          userId: user.id,
        },
      }),
      ...(fee > 0 ? [db.transaction.create({
        data: {
          type: 'transfer_fee',
          amount: -fee,
          detail: `2% transfer fee on $${transferAmount.toFixed(2)} transfer to invest account`,
          userId: user.id,
        },
      })] : []),
    ]);

    return NextResponse.json({
      success: true,
      transfer: {
        from,
        to,
        amount: transferAmount,
        fee,
        received: receivedAmount,
      },
      message: `Transferred $${transferAmount.toFixed(2)} from ${from} to ${to}${fee > 0 ? ` (fee: $${fee.toFixed(2)})` : ''}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
