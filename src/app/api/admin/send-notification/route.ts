import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { target, userId, title, message, type, link } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Titre et message requis' });
    }

    // Sanitize: limit length
    if (title.length > 200 || message.length > 2000) {
      return NextResponse.json({ success: false, error: 'Titre ou message trop long' });
    }

    const notifType = type || 'admin_broadcast';
    const notifLink = link || null;

    if (target === 'all') {
      const users = await db.user.findMany({
        where: { role: 'user' },
        select: { id: true },
      });

      let sentCount = 0;
      for (const u of users) {
        await notifyUser({
          userId: u.id,
          type: notifType,
          title,
          message,
          link: notifLink || undefined,
        });
        sentCount++;
      }

      await db.broadcastMessage.create({
        data: { title, message, target: 'all', type: notifType, userId: null },
      });

      return NextResponse.json({
        success: true,
        message: `Notification envoyée à ${sentCount} utilisateur(s)`,
        count: sentCount,
      });
    } else if (target === 'individual' && userId) {
      const targetUser = await db.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });
      }

      await notifyUser({
        userId,
        type: notifType,
        title,
        message,
        link: notifLink || undefined,
      });

      await db.broadcastMessage.create({
        data: { title, message, target: 'individual', type: notifType, userId },
      });

      return NextResponse.json({
        success: true,
        message: `Notification envoyée à ${targetUser.name}`,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Paramètres invalides. Utilisez target=all ou target=individual avec userId' });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}