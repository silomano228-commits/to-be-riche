import { db } from '@/lib/db';

/**
 * Create a notification for a user.
 * Non-blocking — errors are caught and logged, never throw.
 */
export async function notifyUser(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await db.userNotification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
      },
    });
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

/**
 * Create a notification for the admin.
 */
export async function notifyAdmin(params: {
  type: string;
  title: string;
  message: string;
  ticketId?: string;
  userId?: string;
}) {
  try {
    await db.adminNotification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        ticketId: params.ticketId || null,
        userId: params.userId || null,
      },
    });
  } catch (e) {
    console.error('Failed to create admin notification:', e);
  }
}
