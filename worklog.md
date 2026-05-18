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

## Task 2-b: Merge Invest/Trading/Projet into Finance tab

### Changes made to `/home/z/my-project/src/app/page.tsx`:

1. **Added `FinanceScreen` component** (lines 371-407): New inline component with 3 pill-shaped sub-tabs (Invest/green, Trading/blue, Projets/orange) using local `useState` for active sub-tab. Renders `InvestHubScreen`, `TradingScreen`, or `EnterpriseScreen` based on selection.

2. **Updated `BottomNav` tabs** (lines 409-432): Changed from 5 tabs (Accueil, Invest, Trading, Chat IA, Profil) to 4 tabs (Accueil, Finance, Chat IA, Profil). Added `isActive` helper so the Finance tab highlights when on any of 'finance', 'invest', 'trading', or 'enterprise' pages.

3. **Updated main app render section** (lines 480-483): Replaced individual `invest`/`trading`/`enterprise` screen renders with `FinanceScreen` for all four page IDs ('finance', 'invest', 'trading', 'enterprise'), maintaining backward compatibility.

4. **Updated HomeScreen quick actions** (lines 192-194): Changed Investir/Trader/Projets buttons to navigate to 'finance' page instead of individual pages.

### Lint: No new errors introduced (3 pre-existing errors in unrelated files).

## Task 1: Add adminYasAccount, cfaUsdRate fields and amountCfa support

### Changes made:

1. **Prisma Schema** (`prisma/schema.prisma`):
   - Added `adminYasAccount String @default("")` to `SiteConfig` model
   - Added `cfaUsdRate Float @default(600)` to `SiteConfig` model
   - Added `amountCfa Float @default(0)` to `YasDeposit` model
   - Ran `bun run db:push` — schema applied successfully

2. **Admin Config API** (`src/app/api/admin/config/route.ts`):
   - GET handler: Updated `create` fallback to include `adminYasAccount: ''` and `cfaUsdRate: 600`
   - POST handler: Now extracts `adminYasAccount` and `cfaUsdRate` from request body
   - POST handler: Updated `upsert` update to conditionally set `adminYasAccount` (trimmed) and `cfaUsdRate` (parsed float)
   - POST handler: Updated `upsert` create to include `adminYasAccount` and `cfaUsdRate` with defaults

3. **Yas Deposit API** (`src/app/api/deposit/yas/route.ts`):
   - POST handler: Now accepts `amountCfa` instead of `amountUsd`
   - POST handler: Fetches `cfaUsdRate` from `SiteConfig` and converts CFA to USD: `amountUsd = amountCfa / cfaUsdRate`
   - POST handler: Validates Yas account: must be exactly 8 digits and start with 90-93 or 70-73
   - POST handler: Saves `amountCfa` to YasDeposit record and returns `cfaUsdRate` in response
   - GET handler: Now returns `adminYasAccount`, `cfaUsdRate`, and `trxPrice` from config
   - GET handler: Added `amountCfa` to `pendingDeposit` and `lastProcessed` response objects

4. **Admin Yas Deposits API** (`src/app/api/admin/yas-deposits/route.ts`):
   - No changes needed — Prisma automatically includes the new `amountCfa` field in `findMany` results

### Lint: No new errors introduced (3 pre-existing errors in unrelated files).

---

## Task 2-a: Rewrite DepositScreen.tsx — Yas du Togo Flow Changes

### Changes made:

1. **DepositScreen.tsx** — Complete rewrite of the Yas du Togo flow:

   - **New step order**: Changed from `guide → amount → wallet → success` to `amount → guide → wallet → success`
     - Step 1 (Amount): User enters CFA amount (FCFA), minimum 6000 CFA (≈$10)
     - Step 2 (Guide): Shows Trust Wallet guide (moved from step 1 to step 2)
     - Step 3 (Wallet): User enters 8-digit Yas number + TRX address
     - Step 4 (Success): Confirmation

   - **CFA → USD → TRX Conversion**: Added real-time conversion display
     - Loads `cfaUsdRate` from yas API (default 600 FCFA = 1 USD)
     - Loads `adminYasAccount` from yas API
     - When user enters CFA amount, shows: CFA → USD (÷ cfaUsdRate) → TRX (÷ trxPrice)
     - All three values displayed clearly in conversion card

   - **Yas Number Validation**:
     - Must be exactly 8 digits (auto-strips non-digits, maxLength 8)
     - Must start with 90, 91, 92, 93 or 70, 71, 72, 73
     - Inline validation: shows error (red) or success (green) below input
     - Submit button disabled when validation fails

   - **Admin's Yas Account**:
     - Fetched from yas deposit API (`adminYasAccount`)
     - Displayed prominently on Step 1 (Amount) in a dark card
     - Copy button included for easy copying

   - **Submit sends `amountCfa`**: Changed from `amountUsd` to `amountCfa` in POST body

   - **Pending Yas Deposit card**: Now shows `amountCfa` (formatted as "X FCFA") in addition to `amountUsd` and `amountTrx`

   - **Quick-select presets**: Changed from [10, 25, 50, 100] USD to [6000, 12000, 30000, 60000] FCFA

   - **Separate copy states**: Added `yasCopied` state separate from `copied`

   - **Choose Method page**: Updated Yas card onClick to `setYasStep('amount')` instead of `setYasStep('guide')`

2. **Yas Deposit API** (`src/app/api/deposit/yas/route.ts`):
   - GET handler: Now returns `cfaUsdRate`, `adminYasAccount`, and `amountCfa` in pending deposit
   - POST handler: Now accepts `amountCfa` instead of `amountUsd`, calculates `amountUsd = amountCfa / cfaUsdRate`
   - POST handler: Added server-side Yas account validation (8 digits, prefix 90-93 or 70-73)

### TRX Flow: No changes (kept as-is)
### Choose Method Page: No major changes (only updated initial Yas step)
### Lint: No new errors introduced

---
Task ID: 2-combined
Agent: Main Agent
Task: Update Yas deposit with CFA, admin Yas account, Yas number validation, merge Invest/Trading/Project tabs

Work Log:
- Updated Prisma schema: added adminYasAccount, cfaUsdRate to SiteConfig; added amountCfa to YasDeposit
- Pushed schema changes with bun run db:push
- Updated /api/admin/config to save/load adminYasAccount and cfaUsdRate
- Updated /api/deposit/yas: POST now accepts amountCfa, converts CFA→USD, validates Yas number (8 digits, 90-93 or 70-73 prefix)
- Updated /api/deposit/yas GET: returns adminYasAccount, cfaUsdRate, amountCfa
- Completely rewrote DepositScreen.tsx Yas flow:
  - Step 1: Amount in CFA (FCFA) with CFA→USD→TRX conversion display
  - Step 2: Trust Wallet guide
  - Step 3: Yas number + TRX address input with validation
  - Step 4: Success confirmation
  - Shows admin's Yas account with copy button
  - Quick select presets: 6000, 12000, 30000, 60000 FCFA
- Updated AdminScreen config tab: added "Numéro Yas Admin" and "Taux CFA/USD" fields
- Updated AdminScreen Yas deposits tab: shows FCFA amount and "Compte Yas client" label
- Created FinanceScreen component in page.tsx with 3 sub-tabs (Invest, Trading, Projets)
- Updated BottomNav: 4 tabs instead of 5 (Accueil, Finance, Chat IA, Profil)
- Backward compatibility: invest/trading/enterprise pages all render FinanceScreen

Stage Summary:
- Yas deposit now works in CFA with automatic conversion
- Admin can configure their Yas account number and CFA/USD rate
- Yas number validation: 8 digits, starts with 90-93 or 70-73
- Bottom nav simplified to 4 tabs with Finance combining Invest/Trading/Projets
- All APIs working, lint clean (no new errors)
