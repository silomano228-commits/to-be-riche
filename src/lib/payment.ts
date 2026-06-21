/**
 * Shared payment helpers used by both client components and server API routes.
 *
 * These rules MUST stay in sync with the principal account deposit flow
 * (see `src/components/screens/DepositScreen.tsx`):
 *   - YAS account (Togo): exactly 8 digits, must start with 90-93 or 70-73.
 *   - TRX address: must start with the letter 'T' and be at least 20 chars.
 *   - YAS USSD code for deposits: `*145*1*{amountCfa}*{adminYasAccount}*2#`.
 */

export type PaymentMethod = 'yas' | 'trx';

// Allowed YAS prefixes for Togo numbers (90-93 and 70-73).
const YAS_ALLOWED_PREFIXES = ['90', '91', '92', '93', '70', '71', '72', '73'];

/**
 * Validate a YAS account number (Togo).
 * @returns `null` when valid, or a French error message describing the problem.
 */
export function validateYasAccount(account: string): string | null {
  const trimmed = (account || '').trim();
  if (!trimmed) return 'Numéro de compte Yas requis';
  if (!/^\d{8}$/.test(trimmed)) return 'Le numéro doit contenir exactement 8 chiffres';
  const prefix = trimmed.substring(0, 2);
  if (!YAS_ALLOWED_PREFIXES.includes(prefix)) {
    return 'Le numéro doit commencer par 90-93 ou 70-73';
  }
  return null; // null = valid
}

/**
 * Validate a TRX (Tron) wallet address.
 * @returns `null` when valid, or a French error message describing the problem.
 */
export function validateTrxAddress(address: string): string | null {
  const trimmed = (address || '').trim();
  if (!trimmed) return 'Adresse TRX requise';
  if (trimmed.length < 20) return 'Adresse TRX invalide (trop courte)';
  if (!trimmed.startsWith('T')) return 'L\'adresse TRX doit commencer par la lettre T';
  return null; // null = valid
}

/**
 * Format the YAS USSD code used to initiate a deposit:
 *   `*145*1*{amountCfa}*{adminYasAccount}*2#`
 */
export function formatYasUssd(amountCfa: number, adminYasAccount: string): string {
  return `*145*1*${Math.round(amountCfa)}*${adminYasAccount}*2#`;
}

/**
 * Generic payment-method-aware validator.
 * @returns `null` when valid, or a French error message describing the problem.
 */
export function validatePaymentAddress(method: PaymentMethod, address: string): string | null {
  return method === 'yas' ? validateYasAccount(address) : validateTrxAddress(address);
}
