import { db } from '@/lib/db';
import { checkAdmin } from '@/app/api/admin/data/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type FromAccount = 'investBalance' | 'tradeBalance' | 'projectBalance';

const FROM_ACCOUNT_LABELS: Record<FromAccount, string> = {
  investBalance: 'Investissement',
  tradeBalance: 'Trading',
  projectBalance: 'Projet',
};

export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { userId, fromAccount, amount } = body as {
      userId?: string;
      fromAccount?: string;
      amount?: number;
    };

    // Validate required fields
    if (!userId || !fromAccount || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'Champs manquants: userId, fromAccount, amount sont requis' },
        { status: 400 }
      );
    }

    // Validate fromAccount value
    const validAccounts: FromAccount[] = ['investBalance', 'tradeBalance', 'projectBalance'];
    if (!validAccounts.includes(fromAccount as FromAccount)) {
      return NextResponse.json(
        { success: false, error: `Compte source invalide. Valeurs acceptées: ${validAccounts.join(', ')}` },
        { status: 400 }
      );
    }

    const sourceAccount = fromAccount as FromAccount;

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Le montant doit être un nombre positif' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    // Check sufficient balance in source account
    const sourceBalance = user[sourceAccount];
    if (sourceBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Solde insuffisant dans le compte ${FROM_ACCOUNT_LABELS[sourceAccount]}. Solde disponible: ${sourceBalance.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const accountLabel = FROM_ACCOUNT_LABELS[sourceAccount];
    const detail = `Transfert admin: ${amount.toFixed(2)} USD du compte ${accountLabel} vers le solde principal`;

    // Execute atomic transaction
    const [updatedUser] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
          [sourceAccount]: { decrement: amount },
        },
      }),
      db.transaction.create({
        data: {
          type: 'admin_transfer',
          amount,
          detail,
          userId,
        },
      }),
    ]);

    // Fetch updated balances
    const refreshedUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        investBalance: true,
        tradeBalance: true,
        projectBalance: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        transferred: amount,
        fromAccount: sourceAccount,
        balances: refreshedUser,
      },
    });
  } catch (error) {
    console.error('[admin/transfer-funds] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
