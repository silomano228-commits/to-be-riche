import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET — Liste tous les dépôts en attente (admin)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const deposits = await db.pendingDeposit.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const pending = deposits.filter(d => d.status === 'pending').length;
    const approved = deposits.filter(d => d.status === 'approved').length;
    const rejected = deposits.filter(d => d.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      data: deposits,
      stats: { pending, approved, rejected, total: deposits.length },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST — Approuver ou rejeter un dépôt (admin)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { depositId, action, txHash } = await request.json();

    if (!depositId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides' });
    }

    const deposit = await db.pendingDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return NextResponse.json({ success: false, error: 'Dépôt non trouvé' });
    if (deposit.status !== 'pending') return NextResponse.json({ success: false, error: 'Dépôt déjà traité' });

    if (action === 'reject') {
      await db.pendingDeposit.update({
        where: { id: depositId },
        data: { status: 'rejected' },
      });
      return NextResponse.json({ success: true, message: 'Dépôt rejeté' });
    }

    // Approuver — créditer le solde de l'utilisateur (no instant bonus)
    const depositUser = await db.user.findUnique({ where: { id: deposit.userId } });
    const isFirstDeposit = !depositUser?.hasInvested;

    // Generate random daily rate between 7% and 15%
    const dailyRate = Math.round((Math.random() * 8 + 7) * 100) / 100;
    const categories = ['Tech', 'Énergie', 'Agro', 'Finance', 'Immobilier', 'Santé'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    await db.$transaction([
      db.pendingDeposit.update({
        where: { id: depositId },
        data: { status: 'approved', txHash: txHash || null },
      }),
      db.user.update({
        where: { id: deposit.userId },
        data: {
          invested: { increment: deposit.amountUsd },
          balance: { increment: deposit.amountUsd },
          hasInvested: true,
          depositCount: { increment: 1 },
          firstDepositAt: isFirstDeposit ? new Date() : undefined,
        },
      }),
      db.project.create({
        data: {
          name: `Projet ${category} #${(depositUser?.depositCount || 0) + 1}`,
          amount: deposit.amountUsd,
          receivedAmount: 0,
          description: `Investissement de ${deposit.amountUsd.toFixed(2)} $ dans le secteur ${category}`,
          dailyRate,
          category,
          status: 'active',
          userId: deposit.userId,
        },
      }),
      db.transaction.create({
        data: {
          type: 'deposit',
          amount: deposit.amountUsd,
          gain: 0,
          userId: deposit.userId,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Dépôt approuvé et crédité' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
