import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lightweight endpoint to check if user has pending deposits and detect approvals
// Used by client for fast polling without full session refresh
export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    // Check for pending TRX deposits
    const pendingTrx = await db.pendingDeposit.findFirst({
      where: { userId: token, status: 'pending' },
    });

    // Check for pending Yas deposits
    const pendingYas = await db.yasDeposit.findFirst({
      where: { userId: token, status: 'pending' },
    });

    const hasPending = !!(pendingTrx || pendingYas);

    // Return current balance so client can detect changes
    return NextResponse.json({
      success: true,
      hasPending,
      balance: user.balance,
      investBalance: user.investBalance,
      tradeBalance: user.tradeBalance,
      projectBalance: user.projectBalance,
      depositCount: user.depositCount,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
