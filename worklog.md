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
