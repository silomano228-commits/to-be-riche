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

export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { targetUserId, content } = await request.json();
    if (!targetUserId || !content?.trim()) {
      return NextResponse.json({ success: false, error: 'Champs manquants' });
    }

    const message = await db.chatMessage.create({
      data: { content: content.trim(), userId: targetUserId, isAdmin: true },
    });

    // Return the created message so the frontend can use it directly
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
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
