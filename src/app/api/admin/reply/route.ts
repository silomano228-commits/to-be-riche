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

    const { targetUserId, content } = await request.json();
    if (!targetUserId || !content?.trim()) {
      return NextResponse.json({ success: false, error: 'Champs manquants' });
    }

    // Sanitize content length
    if (content.length > 5000) {
      return NextResponse.json({ success: false, error: 'Message trop long (max 5000 caractères)' });
    }

    const message = await db.chatMessage.create({
      data: { content: content.trim(), userId: targetUserId, isAdmin: true, isAdminMsg: true },
    });

    await notifyUser({
      userId: targetUserId,
      type: 'new_message',
      title: 'Nouveau message',
      message: `L'admin vous a envoyé un message`,
      link: 'chat',
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        text: message.content,
        me: true,
        isAdmin: true,
        isAdminMsg: true,
        t: message.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: message.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}