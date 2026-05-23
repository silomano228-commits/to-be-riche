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
          select: { id: true, name: true, email: true, balance: true },
        },
      },
    });

    const stats = {
      total: withdrawals.length,
      pending: withdrawals.filter(w => w.status === 'pending').length,
      approved: withdrawals.filter(w => w.status === 'approved').length,
      executed: withdrawals.filter(w => w.status === 'executed').length,
      rejected: withdrawals.filter(w => w.status === 'rejected').length,
      totalAmount: withdrawals.filter(w => w.status === 'executed').reduce((s, w) => s + w.amount, 0),
    };

    return NextResponse.json({ success: true, data: withdrawals, stats });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}

// POST — Approve, execute, or reject a withdrawal request (admin only)
// Flow: pending → approved (admin validates) → executed (admin sends funds, balance deducted)
export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { withdrawalId, action, adminNote } = body;

    if (!withdrawalId || !action || !['approve', 'execute', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides' });
    }

    const withdrawal = await db.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) {
      return NextResponse.json({ success: false, error: 'Retrait introuvable' });
    }

    // ========== APPROVE ==========
    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Ce retrait n\'est plus en attente' });
      }

      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'approved', adminNote: adminNote || null },
      });

      return NextResponse.json({ success: true, message: 'Retrait approuvé — prêt pour exécution' });
    }

    // ========== EXECUTE ==========
    if (action === 'execute') {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json({ success: false, error: 'Le retrait doit d\'abord être approuvé' });
      }

      // Verify user still has enough balance (compte principal)
      const user = await db.user.findUnique({ where: { id: withdrawal.userId } });
      if (!user || user.balance < withdrawal.amount) {
        return NextResponse.json({ success: false, error: 'L\'utilisateur n\'a plus assez de solde sur le compte principal' });
      }

      // Deduct from balance (compte principal)
      await db.user.update({
        where: { id: withdrawal.userId },
        data: {
          balance: { decrement: withdrawal.amount },
        },
      });

      // Create a withdrawal transaction record
      const typeLabel = withdrawal.type === 'yas' ? 'Yas' : 'TRX';
      await db.transaction.create({
        data: {
          type: 'withdrawal',
          amount: withdrawal.amount,
          detail: `Retrait ${typeLabel} exécuté — ${withdrawal.amount} $${withdrawal.type === 'yas' ? ` (${withdrawal.amountCfa.toLocaleString()} FCFA vers ${withdrawal.yasAccount})` : ` vers ${withdrawal.trxAddress}`}`,
          userId: withdrawal.userId,
        },
      });

      // Update withdrawal status to executed
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'executed', adminNote: adminNote || null },
      });

      return NextResponse.json({ success: true, message: 'Retrait exécuté — fonds envoyés et solde débité' });
    }

    // ========== REJECT ==========
    if (action === 'reject') {
      if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
        return NextResponse.json({ success: false, error: 'Ce retrait ne peut plus être rejeté' });
      }

      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'rejected', adminNote: adminNote || null },
      });

      return NextResponse.json({ success: true, message: 'Retrait rejeté' });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' });
  } catch (error) {
    console.error('[ADMIN-WITHDRAWALS] Error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
