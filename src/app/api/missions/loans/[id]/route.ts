import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';

// PATCH /api/missions/loans/[id] — Repay loan (user) or approve/reject (admin)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const loan = await db.microLoan.findUnique({ where: { id } });
  if (!loan) return NextResponse.json({ error: 'Prêt introuvable' }, { status: 404 });

  const body = await request.json();
  const { action } = body;

  // === USER: Repay ===
  if (action === 'repay') {
    if (loan.userId !== userId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (!['active', 'repaying', 'overdue'].includes(loan.status)) {
      return NextResponse.json({ error: 'Prêt non actif' }, { status: 400 });
    }

    const { amountCfa } = body;
    if (!amountCfa || amountCfa <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

    const config = await ensureSiteConfig();
    const amountUsd = amountCfa / config.cfaUsdRate;

    // Check user has enough mission balance
    if (user.missionBalance < amountUsd) {
      return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
    }

    const repayAmount = Math.min(amountCfa, loan.amountRemainingCfa);
    const repayUsd = repayAmount / config.cfaUsdRate;

    // Deduct from mission balance
    await db.user.update({
      where: { id: userId },
      data: { missionBalance: { decrement: repayUsd } },
    });

    // Create repayment record
    await db.loanRepayment.create({
      data: {
        loanId: id,
        amountCfa: repayAmount,
        method: 'mission_earnings',
        status: 'completed',
      },
    });

    // Update loan
    const newRemaining = loan.amountRemainingCfa - repayAmount;
    const newStatus = newRemaining <= 0 ? 'completed' : 'repaying';

    await db.microLoan.update({
      where: { id },
      data: {
        amountRepaidCfa: { increment: repayAmount },
        amountRemainingCfa: Math.max(0, newRemaining),
        status: newStatus,
      },
    });

    // Create transaction
    await db.transaction.create({
      data: {
        userId,
        type: 'loan_repayment',
        amount: -repayUsd,
        detail: `Remboursement prêt -${repayAmount} FCFA`,
      },
    });

    if (newStatus === 'completed') {
      await db.userNotification.create({
        data: {
          userId,
          type: 'loan_completed',
          title: 'Prêt remboursé !',
          message: 'Votre prêt a été entièrement remboursé.',
          link: 'missions',
        },
      });
    }

    return NextResponse.json({ success: true, remaining: Math.max(0, newRemaining), status: newStatus });
  }

  // === ADMIN: Approve ===
  if (action === 'approve') {
    if (user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (loan.status !== 'pending') return NextResponse.json({ error: 'Prêt non en attente' }, { status: 400 });

    const config = await ensureSiteConfig();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const loanUsd = loan.amountCfa / config.cfaUsdRate;

    // Credit user balance with loan amount
    await db.user.update({
      where: { id: loan.userId },
      data: { balance: { increment: loanUsd } },
    });

    const updated = await db.microLoan.update({
      where: { id },
      data: {
        status: 'active',
        approvedAt: new Date(),
        disbursedAt: new Date(),
        dueDate,
      },
    });

    await db.transaction.create({
      data: {
        userId: loan.userId,
        type: 'loan_disbursement',
        amount: loanUsd,
        detail: `Prêt de ${loan.amountCfa} FCFA approuvé`,
      },
    });

    await db.userNotification.create({
      data: {
        userId: loan.userId,
        type: 'loan_approved',
        title: 'Prêt approuvé !',
        message: `Votre prêt de ${loan.amountCfa} FCFA a été approuvé et décaissé.`,
        link: 'missions',
      },
    });

    return NextResponse.json({ success: true, loan: updated });
  }

  // === ADMIN: Reject ===
  if (action === 'reject') {
    if (user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const updated = await db.microLoan.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: body.reason || 'Non spécifié',
      },
    });

    await db.userNotification.create({
      data: {
        userId: loan.userId,
        type: 'loan_rejected',
        title: 'Prêt refusé',
        message: `Votre demande de prêt a été refusée. Raison: ${body.reason || 'Non spécifié'}`,
        link: 'missions',
      },
    });

    return NextResponse.json({ success: true, loan: updated });
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
}
