import { db } from '@/lib/db';
import { checkAdmin } from '@/app/api/admin/data/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Admin-editable balance fields. The investBalance concept was removed —
// admins now manage: balance (Solde principal), videoBalance (Vidéo),
// tradeBalance (Trading), projectBalance (Projet).
type BalanceField = 'balance' | 'videoBalance' | 'tradeBalance' | 'projectBalance';

const BALANCE_LABELS: Record<BalanceField, string> = {
  balance: 'Solde principal',
  videoBalance: 'Vidéo',
  tradeBalance: 'Trading',
  projectBalance: 'Projet',
};

const VALID_FIELDS: BalanceField[] = ['balance', 'videoBalance', 'tradeBalance', 'projectBalance'];

export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { userId, field, amount } = body as {
      userId?: string;
      field?: string;
      amount?: number;
    };

    // Validate required fields
    if (!userId || !field || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'Champs manquants: userId, field, amount sont requis' },
        { status: 400 }
      );
    }

    // Validate field value
    if (!VALID_FIELDS.includes(field as BalanceField)) {
      return NextResponse.json(
        { success: false, error: `Champ invalide. Valeurs acceptées: ${VALID_FIELDS.join(', ')}` },
        { status: 400 }
      );
    }

    const balanceField = field as BalanceField;

    // Validate amount
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Le montant doit être un nombre positif ou zéro' },
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

    const oldValue = user[balanceField];
    const fieldLabel = BALANCE_LABELS[balanceField];
    const detail = `Admin: ${fieldLabel} modifié de ${oldValue.toFixed(2)} à ${amount.toFixed(2)} USD`;

    // Execute atomic transaction: update balance + create audit log
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          [balanceField]: amount,
        },
      }),
      db.transaction.create({
        data: {
          type: 'admin_balance_update',
          amount: Math.abs(amount - oldValue),
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
        videoBalance: true,
        tradeBalance: true,
        projectBalance: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        field: balanceField,
        oldValue,
        newValue: amount,
        balances: refreshedUser,
      },
    });
  } catch (error) {
    console.error('[admin/update-balance] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
