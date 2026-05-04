import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch all users who have sent messages
    const usersWithMessages = await db.user.findMany({
      where: {
        chatMessages: { some: { isAdmin: false } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        hasInvested: true,
        createdAt: true,
      },
    });

    const conversations: {
      user_id: string;
      user_name: string | null;
      user_email: string;
      user_balance: number;
      user_has_invested: boolean;
      messages: {
        id: string;
        content: string;
        is_admin: boolean;
        time: string;
        date: string;
        timestamp: number;
      }[];
      last_ts: number;
      last_message: {
        id: string;
        content: string;
        is_admin: boolean;
        time: string;
        date: string;
        timestamp: number;
      } | null;
      unread_count: number;
      total_messages: number;
    }[] = [];

    for (const user of usersWithMessages) {
      const messages = await db.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      const formattedMessages = messages.map((m) => ({
        id: m.id,
        content: m.content,
        is_admin: m.isAdmin,
        time: m.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: m.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        timestamp: m.createdAt.getTime(),
      }));

      // Count unread user messages (those without admin reply after them)
      let lastAdminIdx = -1;
      for (let i = 0; i < formattedMessages.length; i++) {
        if (formattedMessages[i].is_admin) lastAdminIdx = i;
      }
      const unreadCount = formattedMessages.slice(lastAdminIdx + 1).filter((m) => !m.is_admin).length;

      const lastMessage = formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1] : null;

      conversations.push({
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        user_balance: user.balance,
        user_has_invested: user.hasInvested,
        messages: formattedMessages,
        last_ts: lastMessage?.timestamp || 0,
        last_message: lastMessage,
        unread_count: unreadCount,
        total_messages: formattedMessages.length,
      });
    }

    // Sort by last message timestamp (most recent first)
    conversations.sort((a, b) => b.last_ts - a.last_ts);

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
