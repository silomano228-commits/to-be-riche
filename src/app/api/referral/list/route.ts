import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Find all users who were referred by this user's code
    const referredUsers = await db.user.findMany({
      where: { referredByCode: user.referralCode },
      select: {
        id: true,
        name: true,
        email: true,
        hasInvested: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      referrals: referredUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        hasInvested: u.hasInvested,
        date: new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
