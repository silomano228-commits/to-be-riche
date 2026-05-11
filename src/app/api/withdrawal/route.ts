import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET — Check withdrawal status (pending withdrawals for current user)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    const withdrawals = await db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: withdrawals });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}

// POST — Create a withdrawal request (only from gains/earnings account)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    const body = await req.json();
    const { amount, trxAddress } = body;

    // Validate amount
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) {
      return NextResponse.json({ success: false, error: 'Minimum de retrait : 5 $' });
    }

    // Can only withdraw from earnings
    if (amt > user.earnings) {
      return NextResponse.json({ success: false, error: 'Solde de gains insuffisant' });
    }

    // Validate TRX address
    if (!trxAddress || trxAddress.length < 20) {
      return NextResponse.json({ success: false, error: 'Adresse TRX invalide' });
    }

    // Check if user already has a pending withdrawal
    const pendingW = await db.withdrawal.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (pendingW) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une demande de retrait en attente' });
    }

    // Create withdrawal request
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount: amt,
        trxAddress,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, data: { id: withdrawal.id, amount: amt, status: 'pending' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
