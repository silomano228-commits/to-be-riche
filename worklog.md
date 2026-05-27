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
