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

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { ticketId, message } = await request.json();

    if (!ticketId || !message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Ticket ID et message requis' });
    }

    // Verify ticket exists and is open
    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket introuvable' });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ success: false, error: 'Ce ticket est fermé' });
    }

    // Save admin reply as a chat message
    const chatMsg = await db.chatMessage.create({
      data: {
        content: `👤 Admin: ${message.trim()}`,
        userId: ticket.userId,
        isAdmin: true,
        isAdminMsg: true,
        ticketId: ticket.id,
      },
    });

    // Create notification for the user (via in-app notification system)
    // The user will see it when polling messages

    return NextResponse.json({
      success: true,
      message: {
        id: chatMsg.id,
        content: chatMsg.content,
        createdAt: chatMsg.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
