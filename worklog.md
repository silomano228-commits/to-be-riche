---
Task ID: 1
Agent: Main Agent
Task: Implement admin user deletion and notification sending features

Work Log:
- Examined Prisma schema, existing admin API routes, and AdminScreen component
- Confirmed admin user deletion feature already existed (API route + UI with confirmation modal)
- Created new API route `/api/admin/send-notification/route.ts` supporting both broadcast (all users) and individual (specific user) notification sending
- Added notification state variables to AdminScreen (notifTarget, notifUserId, notifTitle, notifMessage, notifSending, notifSearch)
- Added 'Notifs' tab button to the admin tab bar
- Implemented `handleSendNotification` function in AdminScreen
- Added complete Notifs tab UI with: target selector (all/individual), user search & selection, title input, message textarea, live preview, send button
- Tested all APIs via curl - broadcast and individual notification sending both work correctly
- Tested delete user API - returns proper error for non-existent users, prevents self-deletion
- Verified with agent-browser: Admin panel loads, Notifs tab shows correct UI, notification bell shows count after receiving notification

Stage Summary:
- Delete user feature: Already fully implemented (API + UI + confirmation modal)
- New notification sending feature: Fully implemented with:
  - API: POST /api/admin/send-notification with target=all or target=individual
  - UI: New "Notifs" tab in admin panel with broadcast and individual modes
  - User search/filter for individual notifications
  - Live preview of notification before sending
  - Character counter for message (max 500)
  - All API endpoints tested and working
