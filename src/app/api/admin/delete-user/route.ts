import { db } from '@/lib/db';
import { notifyAdmin } from '@/lib/notify';
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

export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: 'ID utilisateur requis' });

    // Cannot delete yourself
    if (userId === admin.id) {
      return NextResponse.json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Check user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    // Prevent deleting other admins
    if (targetUser.role === 'admin') {
      return NextResponse.json({ success: false, error: 'Impossible de supprimer un autre admin' });
    }

    const userName = targetUser.name;
    const userEmail = targetUser.email;

    // Delete user — Cascade will remove related records (transactions, investments, etc.)
    await db.user.delete({ where: { id: userId } });

    // Notify admin
    await notifyAdmin({
      type: 'user_deleted',
      title: 'Utilisateur supprimé',
      message: `${userName} (${userEmail}) a été supprimé par ${admin.name}.`,
      userId: admin.id,
    });

    return NextResponse.json({ success: true, message: `Utilisateur ${userName} supprimé` });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
