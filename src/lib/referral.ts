/**
 * Referral requirement utility
 *
 * Rule: After every 4 withdrawals, 1 additional filleul is required.
 * - Withdrawals 1-4:  0 filleuls needed
 * - Withdrawals 5-8:  1 filleul needed
 * - Withdrawals 9-12: 2 filleuls needed
 * - etc.
 */

import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';

/**
 * Calculate the number of filleuls required for the NEXT withdrawal.
 * @param completedWithdrawals - Number of withdrawals already completed (approved/executed)
 * @returns Number of filleuls required
 */
export function getRequiredReferrals(completedWithdrawals: number): number {
  return Math.floor(completedWithdrawals / 4);
}

/**
 * Check if a user needs more filleuls to make their next withdrawal.
 * @param completedWithdrawals - Number of withdrawals already completed
 * @param referralCount - User's current number of filleuls
 * @returns true if the user needs more filleuls
 */
export function needsMoreReferrals(completedWithdrawals: number, referralCount: number): boolean {
  return getRequiredReferrals(completedWithdrawals) > referralCount;
}

// ---- Referral $5 gift at 12 active referrals (Task 10-A) ----
//
// When a user reaches 12 active referrals, we credit $5 to their principal
// balance and send a congratulation notification. The reward is only ever
// credited ONCE per user — the `referralRewardClaimed` boolean on User
// guards against double-crediting.
//
// The reward is a surprise — it is NOT announced ahead of time in the UI.
// The user only finds out when they receive the notification.

export const REFERRAL_REWARD_THRESHOLD = 12;
export const REFERRAL_REWARD_AMOUNT = 5.0;

/**
 * Check whether a user is eligible for the 12-referral $5 gift, and if so
 * credit it atomically (balance += 5, referralRewardClaimed = true,
 * referral_reward Transaction, user notification).
 *
 * This is safe to call from any API route — it is idempotent thanks to the
 * `referralRewardClaimed` flag and is wrapped in a Prisma transaction.
 *
 * @returns `true` if the reward was just credited on this call, `false`
 *          otherwise (already claimed, or threshold not yet reached).
 */
export async function tryClaimReferralReward(
  user: { id: string; referralCount: number; referralRewardClaimed: boolean }
): Promise<boolean> {
  if (user.referralRewardClaimed) return false;
  if (user.referralCount < REFERRAL_REWARD_THRESHOLD) return false;

  try {
    await db.$transaction(async (tx) => {
      // Re-read inside the tx to avoid races between concurrent callers
      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { referralCount: true, referralRewardClaimed: true },
      });
      if (!fresh) return;
      if (fresh.referralRewardClaimed) return;
      if (fresh.referralCount < REFERRAL_REWARD_THRESHOLD) return;

      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: REFERRAL_REWARD_AMOUNT },
          referralRewardClaimed: true,
        },
      });

      await tx.transaction.create({
        data: {
          type: 'referral_reward',
          amount: REFERRAL_REWARD_AMOUNT,
          detail: 'Cadeau de parrainage — 12 filleuls atteints !',
          userId: user.id,
        },
      });
    });

    // Notification is sent AFTER the transaction commits so we don't notify
    // the user about a reward that failed to persist. notifyUser is
    // non-blocking and never throws.
    await notifyUser({
      userId: user.id,
      type: 'referral_reward',
      title: 'Félicitations ! 🎉',
      message:
        'Vous avez atteint 12 filleuls ! Un cadeau de 5,00 $ a été crédité sur votre compte principal. Actualisez votre page pour voir votre nouveau solde.',
      link: 'wallet',
    });

    return true;
  } catch (e) {
    console.error('Failed to claim referral reward:', e);
    return false;
  }
}
