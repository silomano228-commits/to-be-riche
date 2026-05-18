---
Task ID: 1
Agent: Main Agent
Task: Fix deposit flow, split into two deposit methods (TRX Direct + Yas du Togo), add guides

Work Log:
- Examined current DepositScreen.tsx - found the TRX deposit flow with steps amount → address → success
- Examined deposit API routes (/api/deposit/trx) - confirmed TRX address validation only happens on POST, not blocking page load
- Added YasDeposit model to Prisma schema with fields: amountUsd, amountTrx, trxPrice, yasAccount, trxAddress, status, adminNote
- Added yasDeposits relation to User model
- Pushed schema changes to database with `bun run db:push`
- Created /api/deposit/yas route with GET and POST handlers
- Created /api/admin/yas-deposits route for admin management of Yas conversions
- Completely redesigned DepositScreen.tsx with:
  - Method selection page (choose between TRX Direct and Yas du Togo)
  - TRX Direct deposit flow (3 steps: amount → address → success) with guide
  - Yas du Togo flow (4 steps: guide → amount → wallet → success) with Trust Wallet guide
  - Pending deposit cards for both types
  - Help section on the choose page
- Updated AdminScreen.tsx to include new "Yas 🇹🇬" tab for managing Yas du Togo conversions
  - Added admin note input for each Yas deposit
  - Added loadYasDeposits callback
  - Added stats display for Yas deposits

Stage Summary:
- YasDeposit model added to Prisma and pushed to DB
- Two deposit methods now available: TRX Direct and Yas du Togo conversion
- Trust Wallet guide included as first step in Yas du Togo flow
- Admin panel updated with Yas deposits management tab
- All API routes created and tested (returning proper auth errors for unauthenticated requests)
- App running successfully on port 3000
