import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false });

    const { searchParams } = new URL(request.url);
    const lastId = searchParams.get('lastId') || '0';

    const messages = await db.chatMessage.findMany({
      where: {
        userId: token,
        id: { gt: lastId },
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } },
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      text: m.content,
      me: !m.isAdmin,
      isAdmin: m.isAdmin,
      t: m.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }));

    return NextResponse.json({ success: true, messages: formatted });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
