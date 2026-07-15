import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
import { checkAdmin } from '@/app/api/admin/data/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const withdrawals = await db.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, balance: true } } },
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
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}

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

    if (action === 'approve') {
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Ce retrait n\'est plus en attente' });
      }

      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'approved', adminNote: adminNote || null },
      });

      await notifyUser({
        userId: withdrawal.userId, type: 'withdrawal_approved',
        title: 'Retrait approuvé',
        message: `Votre retrait de ${withdrawal.amount.toFixed(2)} $ a été approuvé.`,
        link: 'wallet',
      });

      return NextResponse.json({ success: true, message: 'Retrait approuvé — prêt pour exécution' });
    }

    if (action === 'execute') {
      if (withdrawal.status !== 'approved') {
        return NextResponse.json({ success: false, error: 'Le retrait doit d\'abord être approuvé' });
      }

      // Determine source balance field
      const src = withdrawal.sourceAccount || 'jeu';
      const balanceFieldMap: Record<string, string> = {
        jeu: 'balance',
        investissement: 'investBalance',
        projet: 'projectBalance',
        video: 'videoBalance',
      };
      const balanceField = balanceFieldMap[src] || 'balance';

      // Execute atomically: check balance + deduct + update status in transaction
      try {
        await db.$transaction(async (tx) => {
          // Re-read user inside transaction for fresh balance
          const user = await tx.user.findUnique({ where: { id: withdrawal.userId } });
          if (!user) throw new Error('Utilisateur introuvable');

          const currentBalance = (user as Record<string, unknown>)[balanceField] as number || 0;

          if (currentBalance < withdrawal.amount) {
            throw new Error(`Solde insuffisant sur le compte ${balanceField}`);
          }

          await tx.user.update({
            where: { id: withdrawal.userId },
            data: { [balanceField]: { decrement: withdrawal.amount } },
          });

          await tx.transaction.create({
            data: {
              type: 'withdrawal',
              amount: withdrawal.amount,
              detail: `Retrait exécuté — ${withdrawal.amount} $ vers ${withdrawal.trxAddress || withdrawal.yasAccount || ''}`,
              userId: withdrawal.userId,
            },
          });

          await tx.withdrawal.update({
            where: { id: withdrawalId },
            data: { status: 'executed', adminNote: adminNote || null },
          });
        });

        await notifyUser({
          userId: withdrawal.userId, type: 'withdrawal_executed',
          title: 'Retrait exécuté !',
          message: `Votre retrait de ${withdrawal.amount.toFixed(2)} $ a été exécuté avec succès.`,
          link: 'wallet',
        });

        return NextResponse.json({ success: true, message: 'Retrait exécuté — fonds envoyés et solde débité' });
      } catch (txError) {
        const msg = txError instanceof Error ? txError.message : 'Erreur lors de l\'exécution';
        return NextResponse.json({ success: false, error: msg });
      }
    }

    if (action === 'reject') {
      if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
        return NextResponse.json({ success: false, error: 'Ce retrait ne peut plus être rejeté' });
      }

      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'rejected', adminNote: adminNote || null },
      });

      await notifyUser({
        userId: withdrawal.userId, type: 'withdrawal_rejected',
        title: 'Retrait rejeté',
        message: `Votre retrait de ${withdrawal.amount.toFixed(2)} $ a été rejeté.`,
        link: 'wallet',
      });

      return NextResponse.json({ success: true, message: 'Retrait rejeté' });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}