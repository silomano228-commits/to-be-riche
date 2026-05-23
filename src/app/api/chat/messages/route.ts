import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false });

    const { searchParams } = new URL(request.url);
    const lastId = searchParams.get('lastId') || '0';

    // If admin, fetch ALL messages for the specified user (query param) or all conversations
    if (user.role === 'admin') {
      const targetUserId = searchParams.get('userId');
      if (targetUserId) {
        const messages = await db.chatMessage.findMany({
          where: { userId: targetUserId, id: { gt: lastId } },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        });

        const formatted = messages.map((m) => ({
          id: m.id,
          text: m.content,
          me: m.isAdmin,
          isAdmin: m.isAdmin,
          isAdminMsg: m.isAdmin,
          t: m.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          date: m.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        }));

        return NextResponse.json({ success: true, messages: formatted });
      }
    }

    // Regular user: fetch their own messages
    const messages = await db.chatMessage.findMany({
      where: { userId: token, id: { gt: lastId } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } },
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      text: m.content,
      me: !m.isAdmin,
      isAdmin: m.isAdmin,
      isAdminMsg: m.isAdmin,
      t: m.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: m.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    }));

    return NextResponse.json({ success: true, messages: formatted });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
