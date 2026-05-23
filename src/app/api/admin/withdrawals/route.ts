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

async function checkAdmin(request: Request) {
  const token = getToken(request);
  if (!token) return { error: NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 }), admin: null };
  const admin = await db.user.findUnique({ where: { id: token } });
  if (!admin || admin.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin };
}

// GET — List all withdrawal requests (admin only)
export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const withdrawals = await db.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, totalProfit: true, balance: true },
        },
      },
    });

    const stats = {
      total: withdrawals.length,
      pending: withdrawals.filter(w => w.status === 'pending').length,
      approved: withdrawals.filter(w => w.status === 'approved').length,
      rejected: withdrawals.filter(w => w.status === 'rejected').length,
      totalAmount: withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0),
    };

    return NextResponse.json({ success: true, data: withdrawals, stats });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}

// POST — Approve or reject a withdrawal request (admin only)
export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { withdrawalId, action, adminNote } = body;

    if (!withdrawalId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides' });
    }

    const withdrawal = await db.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) {
      return NextResponse.json({ success: false, error: 'Retrait introuvable' });
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Ce retrait a déjà été traité' });
    }

    if (action === 'approve') {
      // Use interactive transaction to prevent race condition on concurrent approvals
      const result = await db.$transaction(async (tx) => {
        // Check user balance WITHIN the transaction to avoid TOCTOU issues
        const user = await tx.user.findUnique({ where: { id: withdrawal.userId } });
        if (!user || user.totalProfit < withdrawal.amount) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        // Deduct from earnings and balance
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: {
            totalProfit: { decrement: withdrawal.amount },
            balance: { decrement: withdrawal.amount },
          },
        });

        // Create a withdrawal transaction
        await tx.transaction.create({
          data: {
            type: 'withdrawal',
            amount: withdrawal.amount,
            userId: withdrawal.userId,
            detail: `Withdrawal approved — ${withdrawal.amount} $ to ${withdrawal.trxAddress}`,
          },
        });

        // Update withdrawal status
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: { status: 'approved', adminNote: adminNote || null },
        });

        return true;
      }).catch((e: unknown) => {
        if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
          return 'INSUFFICIENT_BALANCE';
        }
        throw e;
      });

      if (result === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ success: false, error: 'L\'utilisateur n\'a plus assez de gains' });
      }

      return NextResponse.json({ success: true, message: 'Retrait approuvé et débité' });
    } else {
      // Reject
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'rejected', adminNote: adminNote || null },
      });

      return NextResponse.json({ success: true, message: 'Retrait rejeté' });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
