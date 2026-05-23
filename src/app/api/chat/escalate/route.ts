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
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const { reason } = await request.json();
    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Raison requise' });
    }

    // Check if user already has an open ticket
    const existingTicket = await db.supportTicket.findFirst({
      where: { userId: user.id, status: 'open' },
    });

    if (existingTicket) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà un ticket ouvert' });
    }

    // Create support ticket
    const ticket = await db.supportTicket.create({
      data: {
        userId: user.id,
        reason: reason.trim(),
        status: 'open',
      },
    });

    // Add system message to chat
    await db.chatMessage.create({
      data: {
        content: `🔄 Votre conversation a été transférée à un administrateur. Raison : ${reason.trim()}\n\nUn administrateur va vous répondre sous peu. Veuillez patienter.`,
        userId: user.id,
        isAdmin: true,
        isAdminMsg: false,
        ticketId: ticket.id,
      },
    });

    // Create admin notification
    await db.adminNotification.create({
      data: {
        type: 'support_escalation',
        title: 'Demande de support',
        message: `${user.name} (${user.email}) demande l'aide d'un administrateur : ${reason.trim().slice(0, 100)}`,
        ticketId: ticket.id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'Transfert en cours, un administrateur va vous répondre',
    });
  } catch (error) {
    console.error('Escalate error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
