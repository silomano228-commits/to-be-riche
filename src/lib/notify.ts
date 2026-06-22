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
  // Investment approval flow (Task 7): link to the pending deposit or
  // withdrawal that triggered this admin notification.
  depositId?: string;    // PendingDeposit.id or YasDeposit.id
  withdrawalId?: string; // Withdrawal.id
}) {
  try {
    await db.adminNotification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        ticketId: params.ticketId || null,
        userId: params.userId || null,
        depositId: params.depositId || null,
        withdrawalId: params.withdrawalId || null,
      },
    });
  } catch (e) {
    console.error('Failed to create admin notification:', e);
  }
}
