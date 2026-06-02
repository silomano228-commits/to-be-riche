---
Task ID: 1
Agent: Main Agent
Task: Fix deposit flow - remove broken invested/earnings/gain/Project references

Work Log:
- Investigated all deposit-related API routes and frontend components
- Found critical issues: /api/deposit/route.ts referenced `invested`, `earnings`, `gain`, `db.project.create()` which don't exist in Prisma schema
- Found api-helper.ts had `invested` and `earnings` in SafeUser interface
- Found WithdrawalScreen.tsx used `user.earnings` (doesn't exist on AppUser)
- Found WalletScreen.tsx used `user.invested` and `user.earnings` (don't exist on AppUser)
- Fixed /api/deposit/route.ts: replaced all broken references with correct Prisma fields
- Fixed api-helper.ts: updated SafeUser to match current schema (investBalance, tradeBalance, projectBalance, etc.)
- Fixed WithdrawalScreen.tsx: replaced `user.earnings` with `user.balance` on line 218
- Fixed WalletScreen.tsx: replaced `user.invested`/`user.earnings` with `investBalance`/`totalProfit`
- Verified all deposit API endpoints work correctly (GET/POST for TRX and YAS)
- Committed and pushed as af5224c

Stage Summary:
- All deposit flow APIs are working correctly
- TRX and YAS deposit endpoints tested and functional
- Broken legacy code references fixed
- Withdrawal and Wallet screens updated to use correct field names

---
Task ID: 2
Agent: Main Agent
Task: Update guide to reflect all recent improvements (referral bonuses, YAS, corrected rates, etc.)

Work Log:
- Explored entire codebase to catalog all current features vs guide content
- Found many discrepancies between guides.ts and actual implementation
- Updated guides.ts with comprehensive corrections:
  - WALLET_GUIDE: Updated plan names (Starter/Growth/Premium/Elite), added YAS deposit mention, fixed enterprise returns (+15-95%)
  - INVEST_GUIDE: Fixed plan names (Micro→Starter, Standard→Growth, High Yield→Premium), added cycle counts, added 5% referral bonus on gains
  - TRADING_GUIDE: Fixed win profit range (75-85% instead of just 85%), removed specific loss rate
  - ENTERPRISE_GUIDE: Fixed ALL return rates (Short +15-28%, Medium +30-48%, Long +50-68%, Ultra +70-95%), removed crash risk warnings (no crash in code), updated warnings
  - WITHDRAW_GUIDE: Added YAS withdrawal method, TRX→YAS conversion, fixed referral formula (max(1, ceil(N°/2))), added minimum $5
  - REFERRAL_GUIDE: Added 20% first deposit bonus step, 5% investment gains bonus step, fixed referral requirement formula with examples
  - DEPOSIT_GUIDE: Renamed to "Dépôts TRX & YAS", added YAS deposit method, added conversion rates info, added one-pending-at-a-time warning
  - Added new CHAT_GUIDE for AI chatbot and admin support system
- Updated GuideScreen.tsx inline content to match:
  - Fixed investment plan names (Starter instead of Micro)
  - Updated enterprise description (+15% to +95%, no crash)
  - Added referral bonus details (20% first deposit, 5% investment gains)
  - Added TRX→YAS conversion withdrawal method
  - Fixed referral requirement formula
  - Updated withdrawal minimum and conditions

Stage Summary:
- All guide data in guides.ts now accurately reflects the actual app features
- GuideScreen.tsx inline content updated to match
- New CHAT_GUIDE added for support system
- Key corrections: investment plan names, enterprise returns, referral bonuses, YAS support

---
Task ID: 3
Agent: Code Optimizer
Task: Optimize API Routes with Promise.all

Work Log:
- Read current session and login route implementations
- Session route: Added module-level `initialized` flag with `ensureInitialized()` to avoid redundant admin-seed + ensureSiteConfig on every request
- Session route: Parallelized 5 independent DB queries (transactions, investments, trade count, enterprise count, withdrawal count) using Promise.all
- Login route: Parallelized the same 5 independent DB queries using Promise.all
- Verified both files maintain all existing logic, response formats, cookie handling, and imports
- Ran lint — no new errors introduced

Stage Summary:
- Both critical API routes now use Promise.all for parallel DB queries instead of sequential awaits
- Session route uses module-level initialized flag to skip redundant admin seeding and site config checks
- No changes to response format, cookie logic, or dynamic export
- Lint clean (only pre-existing errors in unrelated script files)

---
Task ID: 1
Agent: Code Agent
Task: Add database indexes to Prisma schema and fix Prisma Client cache for production

Work Log:
- Added @@index directives to all 10 models in prisma/schema.prisma for foreign key and frequently queried columns
- Specific indexes added:
  - Transaction: @@index([userId]), @@index([userId, createdAt])
  - Investment: @@index([userId]), @@index([status])
  - Trade: @@index([userId]), @@index([resolved]), @@index([userId, resolved])
  - Enterprise: @@index([userId]), @@index([status])
  - ChatMessage: @@index([userId]), @@index([createdAt])
  - PendingDeposit: @@index([userId]), @@index([status])
  - Withdrawal: @@index([userId]), @@index([status])
  - YasDeposit: @@index([userId]), @@index([status])
  - OtpCode: @@index([email]), @@index([used])
  - PasswordResetToken: @@index([userId]), @@index([token])
- Fixed src/lib/db.ts: Removed the `if (process.env.NODE_ENV !== 'production')` guard around `globalForPrisma.prisma = db` so the PrismaClient is always cached
- Added development/production log levels to local SQLite PrismaClient constructor
- Ran `bun run db:push` — database synced successfully, Prisma Client regenerated (v6.19.2)

Stage Summary:
- All 15 @@index directives added across 10 models (including 2 composite indexes)
- Prisma Client caching now works in both development and production environments
- Database schema is in sync, client regenerated
---
Task ID: 4
Agent: Main Agent
Task: Fix client-side ChunkLoadError / 404 for static files in standalone deployment

Work Log:
- Analyzed browser console errors: all JS chunks, CSS files, and manifest.json returning 404
- Identified root cause: Next.js `output: 'standalone'` does NOT copy `.next/static/` or `public/` into the `.next/standalone/` directory
- The standalone server.js runs from `.next/standalone/` and looks for static files relative to its location
- Without these files, ALL JS/CSS chunks fail to load → ChunkLoadError → complete client-side crash
- Created `scripts/standalone-setup.js` postbuild script that copies:
  1. `.next/static/` → `.next/standalone/.next/static/`
  2. `public/` → `.next/standalone/public/`
  3. `prisma/` → `.next/standalone/prisma/` (for schema access)
  4. `db/` → `.next/standalone/db/` (for SQLite database)
- Updated `package.json` build script to include `&& node scripts/standalone-setup.js`
- Tested the script locally - all files copied correctly
- Committed as 8c2eb62 and pushed to origin/main

Stage Summary:
- Root cause identified: missing static file copy in standalone deployment
- Fix: postbuild script copies static files, public folder, prisma, and db into .next/standalone/
- Push ready - user needs to pull and rebuild on VPS
