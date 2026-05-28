/**
 * Referral requirement utility
 * 
 * Rule: After every 4 withdrawals, 1 additional filleul is required.
 * - Withdrawals 1-4:  0 filleuls needed
 * - Withdrawals 5-8:  1 filleul needed
 * - Withdrawals 9-12: 2 filleuls needed
 * - etc.
 */

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
