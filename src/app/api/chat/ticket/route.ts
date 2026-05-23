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

    // Check if user has an open ticket
    const ticket = await db.supportTicket.findFirst({
      where: { userId: token, status: 'open' },
      orderBy: { createdAt: 'desc' },
    });

    if (!ticket) {
      return NextResponse.json({ success: true, ticket: null });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        reason: ticket.reason,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
