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

// GET: List all support tickets
export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const ticketId = searchParams.get('ticketId');

    if (ticketId) {
      // Get specific ticket with user and chat messages
      const ticket = await db.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return NextResponse.json({ success: false, error: 'Ticket introuvable' });
      }

      const ticketUser = await db.user.findUnique({
        where: { id: ticket.userId },
        select: { name: true, email: true },
      });

      const messages = await db.chatMessage.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: 'asc' },
      });

      return NextResponse.json({
        success: true,
        ticket: {
          id: ticket.id,
          reason: ticket.reason,
          status: ticket.status,
          createdAt: ticket.createdAt.toISOString(),
          user: ticketUser,
          messages: messages.map(m => ({
            id: m.id,
            content: m.content,
            isAdmin: m.isAdmin,
            isAdminMsg: m.isAdminMsg,
            ticketId: m.ticketId,
            createdAt: m.createdAt.toISOString(),
          })),
        },
      });
    }

    // List tickets
    const where: any = {};
    if (status !== 'all') where.status = status;

    const tickets = await db.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Fetch users and last messages for each ticket
    const ticketsWithMeta = await Promise.all(
      tickets.map(async (t) => {
        const ticketUser = await db.user.findUnique({
          where: { id: t.userId },
          select: { name: true, email: true },
        });
        const lastMsg = await db.chatMessage.findFirst({
          where: { ticketId: t.id },
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        });
        return {
          id: t.id,
          reason: t.reason,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          user: ticketUser,
          lastMessage: lastMsg?.content?.slice(0, 80) || '',
        };
      })
    );

    const openCount = await db.supportTicket.count({ where: { status: 'open' } });
    const closedCount = await db.supportTicket.count({ where: { status: 'closed' } });

    return NextResponse.json({
      success: true,
      tickets: ticketsWithMeta,
      stats: { open: openCount, closed: closedCount, total: openCount + closedCount },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST: Close a ticket
export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const { ticketId, action } = await request.json();

    if (!ticketId) return NextResponse.json({ success: false, error: 'Ticket ID requis' });

    if (action === 'close') {
      await db.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'closed' },
      });

      // Get the ticket to find user
      const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
      if (ticket) {
        await db.chatMessage.create({
          data: {
            content: '✅ Votre ticket de support a été résolu et fermé par un administrateur. N\'hésitez pas à rouvrir une conversation si besoin.',
            userId: ticket.userId,
            isAdmin: true,
            isAdminMsg: true,
            ticketId: ticket.id,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action non reconnue' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
