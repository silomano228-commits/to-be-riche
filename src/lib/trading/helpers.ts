// Shared helpers for Trading Arena API routes

export const BASE_PRICES: Record<string, { base: number; volatility: number; decimals: number; pip: number }> = {
  'EUR/USD':   { base: 1.085,  volatility: 0.008,  decimals: 5, pip: 0.0001 },
  'GBP/USD':   { base: 1.27,   volatility: 0.012,  decimals: 5, pip: 0.0001 },
  'BTC/USD':   { base: 67500,  volatility: 800,    decimals: 2, pip: 0.01 },
  'ETH/USD':   { base: 3450,   volatility: 120,    decimals: 2, pip: 0.01 },
  'GOLD/USD':  { base: 2340,   volatility: 35,     decimals: 2, pip: 0.01 },
  'SILVER/USD':{ base: 29.5,   volatility: 0.8,    decimals: 4, pip: 0.001 },
};

export const VALID_ASSETS = Object.keys(BASE_PRICES);

export const MIN_TRADE_AMOUNT = 1;
export const MIN_BALANCE_TO_ACCESS = 5;

/**
 * Simple seeded PRNG for deterministic price generation within a time window.
 * Prices stay consistent for ~60 seconds then shift.
 */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Get current simulated price for an asset.
 * Uses a time-based seed so prices are consistent within a ~30s window.
 */
export function getSimulatedPrice(asset: string): number {
  const info = BASE_PRICES[asset];
  if (!info) throw new Error(`Unknown asset: ${asset}`);

  // Time bucket: changes every 30 seconds
  const timeBucket = Math.floor(Date.now() / 30000);
  const seed = Math.round(info.base * 10000) + timeBucket * 7 + asset.length * 13;
  const rand = seededRandom(seed);

  // Random variation: ±0.01% to ±0.5% from base
  const variationPct = (rand() - 0.5) * 0.01; // ±0.5%
  const price = info.base * (1 + variationPct);

  return Math.round(price * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals);
}

/**
 * Get simulated price with additional random walk for more realism.
 * Used when closing a position to add some variability.
 */
export function getSimulatedPriceWithWalk(asset: string): number {
  const info = BASE_PRICES[asset];
  if (!info) throw new Error(`Unknown asset: ${asset}`);

  const timeBucket = Math.floor(Date.now() / 30000);
  const seed = Math.round(info.base * 10000) + timeBucket * 7 + asset.length * 13;
  const rand = seededRandom(seed);

  // Random walk: ±0.01% to ±1% 
  const walkPct = (rand() - 0.5) * 0.02; // ±1%
  const price = info.base * (1 + walkPct);

  return Math.round(price * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals);
}

/**
 * Calculate P/L for a position.
 * For BUY: P/L = amount * ((currentPrice - entryPrice) / entryPrice)
 * For SELL: P/L = amount * ((entryPrice - currentPrice) / entryPrice)
 */
export function calculatePL(
  direction: string,
  amount: number,
  entryPrice: number,
  currentPrice: number
): { profitLoss: number; plPercent: number } {
  let plPercent: number;
  if (direction === 'BUY') {
    plPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    plPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
  }
  const profitLoss = Math.round(amount * (plPercent / 100) * 100) / 100;
  plPercent = Math.round(plPercent * 100) / 100;
  return { profitLoss, plPercent };
}

/**
 * Auth helpers - consistent with existing routes
 */
export function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}
