import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { notifyAdmin } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: 'ID utilisateur requis' });

    if (userId === user.id) {
      return NextResponse.json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    if (targetUser.role === 'admin') {
      return NextResponse.json({ success: false, error: 'Impossible de supprimer un autre admin' });
    }

    const userName = targetUser.name;
    const userEmail = targetUser.email;

    await db.user.delete({ where: { id: userId } });

    await notifyAdmin({
      type: 'user_deleted',
      title: 'Utilisateur supprimé',
      message: `${userName} (${userEmail}) a été supprimé par ${user.name}.`,
      userId: user.id,
    });

    return NextResponse.json({ success: true, message: `Utilisateur ${userName} supprimé` });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}