# Task ID 2b — Frontend Developer (InvestHubScreen)

## Task
Rewrite `/home/z/my-project/src/components/screens/InvestHubScreen.tsx` to match the reworked investment backend (Task ID 9-backend):
- No `investBalance` anymore — deposits made directly via YAS/TRX at every level
- Unlimited daily collections (totalCycles=0)
- Claim payout method chooser: (a) withdraw directly via YAS/TRX (min $5) or (b) transfer to main account (no min)
- Clean vertical investment cards (user complained tables were "trop toufu")

## Work Log
- Read `worklog.md` to learn the full backend rework contract (Task 9-backend).
- Read current `InvestHubScreen.tsx` (581 lines) to understand structure and what to preserve (Header, modals, congrats).
- Confirmed `INVEST_LEVELS` in `src/components/shared.tsx` now has `unlimited:true` and `cycles:0` for all 4 levels (Micro $5-10, Standard $10.5-20 with 2 referrals, Premium $65-250 with 10 referrals, Elite $300-1000 with 15 referrals).
- Verified backend contracts:
  - `GET /api/invest/list` returns `{ investments, summary }` with `unlimited`, `remainingCycles`, `canClaim`, `nextClaimInMs`, `doneCycles`, `totalCycles`, `earned`, `amount`, `level`, `status`, `rate`.
  - `POST /api/invest/create` body: `{ level, amount, paymentMethod: 'yas'|'trx', userAddress }`.
  - `POST /api/invest/claim` body: `{ investmentId, payoutMethod: 'yas_trx'|'main', userAddress?, paymentType? }` — returns `gainTooSmall:true` when gain <$5.
  - `POST /api/invest/unlock` body: `{ level }` — referral-only unlock, no payment.
- Performed a full rewrite of `InvestHubScreen.tsx` (~620 lines):

  1. **Removed investBalance display entirely**. Replaced with a hero summary card showing total earned (with `summary.totalEarned`) + total invested + active count, using a green→teal gradient.

  2. **Investment flow modal**: Picking a level and clicking "Investir" opens a bottom-sheet modal with:
     - Level name + rate (10%/jour) + Illimité badge + min/max range
     - Amount input with live validation (red border if out of range)
     - Live daily-gain preview when amount is valid
     - Payment-method selector: two big cards YAS (teal) vs TRX (red)
     - Address input (label changes: "Adresse portefeuille TRX" vs "Numéro de compte YAS")
     - 6-hour availability note in amber
     - Submit button → POST /api/invest/create. On success → CongratulationsModal (type='generic') with amount + backend message, then refresh investments + user.

  3. **Vertical investment cards** (replaces cluttered table). Each active investment card shows:
     - Top row: colored level icon + name + amount/rate
     - "Illimité" badge (top right)
     - 2-col stats grid: "Collectes: N jours" (no /total) and "Gagné: +$X.XX"
     - Bottom: if `canClaim` → prominent pulsing green "Collecter +$X" button; else → countdown timer HH:MM:SS with pulsing colons

  4. **Claim payout modal** (opens when Collecter clicked):
     - Big gradient gain display "+$X.XX"
     - Option A: "Verser sur le compte principal" (green) — always enabled, no minimum, instant credit
     - Option B: "Retirer par YAS/TRX" (teal) — disabled if gain <$5 (shows MIN $5 badge). When enabled & selected, sub-selector for YAS vs TRX + address input + 6h note
     - When gain <$5 and Option A selected, an amber info note explains why YAS/TRX is unavailable
     - Submit → POST /api/invest/claim with chosen payoutMethod/userAddress/paymentType. On success → CongratulationsModal (type='collect') with gain amount + backend message, refresh investments + user.

  5. **Referral requirement for locked levels**: For each level > `user.unlockedLevel`, the level card shows a "Débloquer" button with current/required referral count. Clicking opens the unlock modal with:
     - Referral requirement card: `referralCount / required` + progress bar
     - Green check + "assez de parrainés pour débloquer gratuitement" if canUnlock
     - Amber "il vous manque N parrainé(s)" if not
     - "Débloquer gratuitement" button calls POST /api/invest/unlock (only enabled when canUnlock). If insufficient referrals, shows "Parrainés insuffisants" placeholder.
     - Sequential gating: if user hasn't invested in previous level, card shows "Investissez d'abord au Niv. X" instead.

  6. Used required imports: `useAppStore, formatMoney, authFetch, refreshUser` from `@/lib/store`; `Header, INVEST_LEVELS` from `@/components/shared`; `CongratulationsModal, type CongratulationsData` from `@/components/CongratulationsModal`. (Dropped unused `esc, LogoImg, Modal, ENTERPRISE_TYPES, ENTERPRISE_NAMES, type AppUser, setUser`.)

  7. Mobile-first design: bottom-sheet modals on mobile (`items-end`) centering on `sm:` breakpoints. Green/teal color scheme (`#22C55E`, `#16A34A`, `#14B8A6`, `#0F766E`). Font Awesome icons throughout (`fa-seedling`, `fa-chart-line`, `fa-crown`, `fa-gem`, `fa-infinity`, `fa-hand-holding-dollar`, `fa-wallet`, `fa-money-bill-transfer`, `fa-lock-open`, `fa-users`, `fa-clock`, `fa-spinner`).

  8. `useState` for all modals (showCreate, unlockLevel, claimTarget, congrats) + nested state (createPayment, createAddress, claimPaymentType, claimAddress, payoutChoice). `useEffect` + `useCallback` for `loadInvestments()`. `setNow` 1s timer drives countdowns via `nextClaimAt`.

- Lint: `bun run lint` returns only the 8 pre-existing `no-require-imports` errors in `.dev-server.js` and `scripts/*` — zero new errors in `InvestHubScreen.tsx`.
- TypeScript: `npx tsc --noEmit` reports zero errors touching `InvestHubScreen.tsx`.

## Stage Summary
- 1 file modified: `src/components/screens/InvestHubScreen.tsx` (full rewrite, ~620 lines).
- All 5 required behaviors implemented:
  1. ✅ No `investBalance` display — replaced with hero "gains investis" summary card.
  2. ✅ Investment flow modal with amount, YAS/TRX selector, address input, 6h note, CongratulationsModal on success.
  3. ✅ Vertical readable investment cards (level icon, amount/rate, Illimité badge, Collectes count, Gagné total, countdown OR pulsing Collecter button).
  4. ✅ Claim payout modal with main-account vs YAS/TRX withdrawal options, gain<$5 disables YAS/TRX with explanatory note, CongratulationsModal on success.
  5. ✅ Locked-level referral cards with progress bar and Débloquer button calling /api/invest/unlock.
- Backend API contracts from Task 9-backend honored exactly (payoutMethod 'main'|'yas_trx', paymentType 'trx'|'yas', 6h availability messaging).
- Mobile-first, green/teal palette, Font Awesome icons, Framer-style CSS animations (claim pulse, hero glow, slide-up, timer-colon blink).
- Lint and TypeScript clean (only pre-existing project-wide errors remain).
