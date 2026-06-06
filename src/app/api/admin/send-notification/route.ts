import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
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

    const { target, userId, title, message, type, link } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Titre et message requis' });
    }

    const notifType = type || 'admin_broadcast';
    const notifLink = link || null;

    if (target === 'all') {
      // Broadcast to all non-admin users
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

      return NextResponse.json({
        success: true,
        message: `Notification envoyée à ${sentCount} utilisateur(s)`,
        count: sentCount,
      });
    } else if (target === 'individual' && userId) {
      // Send to specific user
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

      return NextResponse.json({
        success: true,
        message: `Notification envoyée à ${targetUser.name}`,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Paramètres invalides. Utilisez target=all ou target=individual avec userId' });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
