---
Task ID: 1
Agent: Main Agent
Task: Fix site visibility and update minimum deposit to $5 for YAS and TRX everywhere

Work Log:
- Verified dev server is running on port 3000 (PID 18888)
- Confirmed the site is accessible and renders correctly via agent browser
- Updated YAS deposit minimum from 6,000 FCFA to 3,000 FCFA ($5 equivalent at 600 FCFA/dollar rate)
- Updated all frontend references in DepositScreen.tsx (minimum checks, placeholder text, quick amount buttons, disabled state)
- Updated backend API validation in /api/deposit/yas/route.ts (6000 → 3000)
- Updated GuideScreen.tsx YAS minimum text
- Updated guides.ts library (3 occurrences of "6 000 FCFA" → "3 000 FCFA")
- Updated chat bot system prompt to include YAS minimum
- Fixed admin reply route to set isAdminMsg: true (was missing, causing admin messages to not properly display in user's chat)
- Verified with agent browser that deposit screen shows "Min: 3 000 FCFA" for YAS and "Min: $5" for TRX

Stage Summary:
- Site is up and running on port 3000
- Minimum deposit is now $5 for both YAS (3,000 FCFA) and TRX
- All UI text updated across DepositScreen, GuideScreen, guides.ts, and chat bot
- Admin messages now properly flagged with isAdminMsg: true for user's chat display
- Features already implemented from previous sessions: referral count, total/daily gains, admin-only notifications, delete accounts
