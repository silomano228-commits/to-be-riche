---
Task ID: 1
Agent: Main Agent
Task: Simplify deposit/withdrawal system - remove conversion, keep YAS + TRX only

Work Log:
- Explored current codebase: DepositScreen.tsx (3 methods), WithdrawScreen.tsx (2 methods + conversion), AdminScreen.tsx, all API routes
- Rewrote DepositScreen.tsx: simplified from 3 methods to 2 (TMoney/Yas + TRX direct), removed "TMoney → TRX" conversion option
- Rewrote WithdrawScreen.tsx: simplified from TRX + conversion to TRX + YAS withdrawal, removed "TRX → TMoney" conversion, restored YAS withdrawal option
- Updated /api/deposit/yas route: forced destination='balance', removed trxAddress and destination validation
- Updated /api/admin/yas-deposits route: removed TRX destination logic, always credits balance
- Updated /api/admin/withdrawals route: removed convert_trx_tmoney type handling, simplified to TRX/YAS
- Updated AdminScreen.tsx: YAS deposits tab shows "Dépôts TMoney" (not "Conversions"), removed → TRX badge, simplified approve flow; Withdrawals tab shows TMoney badge instead of YAS/TRX→TMoney, removed conversion info boxes

Stage Summary:
- Deposit: 2 methods only → TMoney (Yas) to balance, TRX direct to balance
- Withdrawal: 2 methods only → TRX to wallet, TMoney (Yas) FCFA withdrawal
- Conversion process completely removed from all frontend screens and admin panel
- Backend API routes simplified (YAS deposit always goes to balance, no more TRX destination)
- All existing API routes preserved for backward compatibility with legacy data
- App compiles and runs on port 3000
