# Task 4 - Trading Arena Database Schema & API Routes

## Summary
Created the complete database schema and 7 API routes for the Trading Arena feature.

## Files Created
1. **prisma/schema.prisma** - Added `TradingPosition` model and `tradingPositions` relation to User model
2. **src/lib/trading/helpers.ts** - Shared module with:
   - `BASE_PRICES` - 6 assets (EUR/USD, GBP/USD, BTC/USD, ETH/USD, GOLD/USD, SILVER/USD)
   - `getSimulatedPrice()` - Deterministic price with 30s consistency window
   - `getSimulatedPriceWithWalk()` - Price with wider random walk for closing
   - `calculatePL()` - P/L calculation for BUY/SELL
   - `getToken()` - Auth helper matching existing codebase pattern
3. **src/app/api/trading/open-position/route.ts** - POST: Open position
4. **src/app/api/trading/close-position/route.ts** - POST: Close position
5. **src/app/api/trading/positions/route.ts** - GET: Open + recent closed positions
6. **src/app/api/trading/prices/route.ts** - GET: Simulated prices for all assets
7. **src/app/api/trading/chart/route.ts** - GET: OHLCV candlestick data
8. **src/app/api/trading/history/route.ts** - GET: Paginated trade history
9. **src/app/api/trading/leaderboard/route.ts** - GET: Top 20 users by profit

## Testing Results
All endpoints tested with admin user token - all working correctly:
- Price simulation returns consistent prices within 30s windows
- Position opening/closing with proper balance management
- Stop loss, take profit, and liquidation auto-detection
- Chart data generation for 7 timeframes
- Pagination and summary stats in history
- Leaderboard aggregation (manual, SQLite-compatible)

## Key Decisions
- Used manual aggregation for leaderboard instead of Prisma `groupBy` with `orderBy` (SQLite compatibility)
- Price simulation uses seeded PRNG based on time buckets for consistency
- Positions endpoint auto-closes positions that hit SL/TP thresholds
- Minimum trade amount: $1, minimum balance to access: $5
