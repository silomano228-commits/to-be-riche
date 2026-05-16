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
  if (!token) return { error: NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 }), admin: null };
  const admin = await db.user.findUnique({ where: { id: token } });
  if (!admin || admin.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin };
}

// GET — Liste tous les dépôts en attente (admin)
export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

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
    const { error } = await checkAdmin(request);
    if (error) return error;

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

    // Approuver — créditer le solde principal de l'utilisateur
    const depositUser = await db.user.findUnique({ where: { id: deposit.userId } });
    const isFirstDeposit = !depositUser?.hasInvested;

    await db.$transaction([
      db.pendingDeposit.update({
        where: { id: depositId },
        data: { status: 'approved', txHash: txHash || null },
      }),
      db.user.update({
        where: { id: deposit.userId },
        data: {
          balance: { increment: deposit.amountUsd },
          hasInvested: true,
          depositCount: { increment: 1 },
          firstDepositAt: isFirstDeposit ? new Date() : undefined,
        },
      }),
      db.transaction.create({
        data: {
          type: 'deposit',
          amount: deposit.amountUsd,
          detail: `Deposit approved: $${deposit.amountUsd.toFixed(2)} credited to principal balance`,
          userId: deposit.userId,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Dépôt approuvé et crédité au solde principal' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
