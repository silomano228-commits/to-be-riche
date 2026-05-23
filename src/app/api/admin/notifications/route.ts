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

export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await db.adminNotification.findMany({
      where: unreadOnly ? { read: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await db.adminNotification.count({
      where: { read: false },
    });

    return NextResponse.json({
      success: true,
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        ticketId: n.ticketId,
        userId: n.userId,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { notificationId, markAllRead } = await request.json();

    if (markAllRead) {
      await db.adminNotification.updateMany({
        where: { read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      await db.adminNotification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Paramètres manquants' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
