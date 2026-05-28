import { db } from '@/lib/db';

// Default values for SiteConfig — used on fresh deployments (e.g. Vercel)
// where the SiteConfig row may not exist yet or has empty critical fields.
const DEFAULTS = {
  adminTrxAddress: 'TRMJ5R1cKbrMLy19PLu9rVtVGc5Ff2ZrHY',
  adminYasAccount: '90876459',
  trxUsdPrice: 0.12,
  cfaUsdRate: 600,
} as const;

/**
 * Ensures the SiteConfig row exists and has non-empty critical fields.
 * - If the row does not exist, it is created with default values.
 * - If the row exists but has empty `adminTrxAddress` or `adminYasAccount`,
 *   those fields are back-filled with defaults.
 * - Returns the up-to-date SiteConfig record.
 */
export async function ensureSiteConfig() {
  let config = await db.siteConfig.findUnique({ where: { id: 'main' } });

  if (!config) {
    config = await db.siteConfig.create({
      data: {
        id: 'main',
        adminTrxAddress: DEFAULTS.adminTrxAddress,
        adminYasAccount: DEFAULTS.adminYasAccount,
        trxUsdPrice: DEFAULTS.trxUsdPrice,
        cfaUsdRate: DEFAULTS.cfaUsdRate,
      },
    });
    return config;
  }

  // Back-fill any empty critical fields with defaults
  const updates: Record<string, unknown> = {};
  if (!config.adminTrxAddress) updates.adminTrxAddress = DEFAULTS.adminTrxAddress;
  if (!config.adminYasAccount) updates.adminYasAccount = DEFAULTS.adminYasAccount;
  if (config.trxUsdPrice === 0) updates.trxUsdPrice = DEFAULTS.trxUsdPrice;
  if (config.cfaUsdRate === 0) updates.cfaUsdRate = DEFAULTS.cfaUsdRate;

  if (Object.keys(updates).length > 0) {
    config = await db.siteConfig.update({
      where: { id: 'main' },
      data: updates,
    });
  }

  return config;
}
