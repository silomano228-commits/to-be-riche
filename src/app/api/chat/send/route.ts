import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur non trouvé' }, { status: 401 });

    const { content } = await request.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Message vide' });
    }

    const message = await db.chatMessage.create({
      data: { content: content.trim(), userId: token, isAdmin: user.role === 'admin' },
    });

    // Return the created message so the frontend can use it instead of refetching
    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        text: message.content,
        me: true,
        isAdmin: message.isAdmin,
        isAdminMsg: message.isAdmin,
        userId: token,
        userName: user.name,
        t: message.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: message.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
