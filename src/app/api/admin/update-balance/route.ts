import { db } from '@/lib/db';
import { checkAdmin } from '@/app/api/admin/data/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Admin-editable numeric amount fields on the User model.
// Covers every "amount" the user can hold — not just the 4 wallet balances.
//
// Float fields (money amounts):
//   balance, videoBalance, tradeBalance, projectBalance, investBalance,
//   gameTotalWon, videoTotalEarned, totalProfit, totalLoss
//
// Int fields (counters):
//   referralCount
type BalanceField =
  | 'balance'
  | 'videoBalance'
  | 'tradeBalance'
  | 'projectBalance'
  | 'investBalance'
  | 'gameTotalWon'
  | 'videoTotalEarned'
  | 'totalProfit'
  | 'totalLoss'
  | 'referralCount';

const BALANCE_LABELS: Record<BalanceField, string> = {
  balance: 'Solde principal',
  videoBalance: 'Vidéo',
  tradeBalance: 'Trading',
  projectBalance: 'Projet',
  investBalance: 'Investissement',
  gameTotalWon: 'Gains jeu',
  videoTotalEarned: 'Gains vidéo totaux',
  totalProfit: 'Profit total',
  totalLoss: 'Perte totale',
  referralCount: 'Parrainages',
};

// Integer fields stored as Int in Prisma — must be rounded before save.
const INT_FIELDS: BalanceField[] = ['referralCount'];

const VALID_FIELDS: BalanceField[] = [
  'balance',
  'videoBalance',
  'tradeBalance',
  'projectBalance',
  'investBalance',
  'gameTotalWon',
  'videoTotalEarned',
  'totalProfit',
  'totalLoss',
  'referralCount',
];

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
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Le montant doit être un nombre positif ou zéro' },
        { status: 400 }
      );
    }

    // Round integer fields to avoid Prisma Int cast errors
    const sanitizedAmount = INT_FIELDS.includes(balanceField)
      ? Math.round(amount)
      : Math.round(amount * 100) / 100;

    // Find user
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    const oldValue = (targetUser as any)[balanceField] as number;
    const fieldLabel = BALANCE_LABELS[balanceField];
    const detail = `Admin: ${fieldLabel} modifié de ${oldValue.toFixed(2)} à ${sanitizedAmount.toFixed(2)}`;

    // Execute atomic transaction: update field + create audit log
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          [balanceField]: sanitizedAmount,
        },
      }),
      db.transaction.create({
        data: {
          type: 'admin_balance_update',
          amount: Math.abs(sanitizedAmount - oldValue),
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
        investBalance: true,
        gameTotalWon: true,
        videoTotalEarned: true,
        totalProfit: true,
        totalLoss: true,
        referralCount: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        field: balanceField,
        oldValue,
        newValue: sanitizedAmount,
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
