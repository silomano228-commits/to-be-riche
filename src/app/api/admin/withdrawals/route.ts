import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET — List all withdrawal requests (admin only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' });
    }

    const withdrawals = await db.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, earnings: true, balance: true },
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
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' });
    }

    const body = await req.json();
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
      // Verify user still has enough earnings
      const user = await db.user.findUnique({ where: { id: withdrawal.userId } });
      if (!user || user.earnings < withdrawal.amount) {
        return NextResponse.json({ success: false, error: 'L\'utilisateur n\'a plus assez de gains' });
      }

      // Deduct from earnings and balance
      await db.user.update({
        where: { id: withdrawal.userId },
        data: {
          earnings: { decrement: withdrawal.amount },
          balance: { decrement: withdrawal.amount },
        },
      });

      // Create a withdrawal transaction
      await db.transaction.create({
        data: {
          type: 'withdrawal',
          amount: withdrawal.amount,
          gain: 0,
          userId: withdrawal.userId,
        },
      });

      // Update withdrawal status
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'approved', adminNote: adminNote || null },
      });

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
