---
Task ID: 1-9
Agent: main
Task: Replace video section with Espace Jeunes (mission-based image generation & micro-loans)

Work Log:
- Updated Prisma schema: removed VideoWatch, AdminVideoLink models; added Campaign, MissionImage, MicroLoan, LoanRepayment models
- Updated User model: removed video* fields, added mission*, caution*, personalDeposit*, userLevel, reputationScore, etc.
- Updated SiteConfig model: added missionRewardCfa, missionDailyLimit, missionObjectiveCfa, cautionAmountCfa, loan* fields
- Ran db:push --accept-data-loss to sync schema
- Deleted old video API routes (/api/videos/*, /api/admin/videos/*)
- Deleted VideoPlatformScreen.tsx
- Created new API routes: /api/missions/campaigns, /api/missions/images, /api/missions/dashboard, /api/missions/eligibility, /api/missions/loans, /api/missions/caution, /api/admin/missions, /api/admin/campaigns
- API routes include: AI image generation (z-ai-web-dev-sdk), VLM validation, similarity detection, reward crediting, loan management
- Created MissionsScreen.tsx with 5 sub-tabs: Dashboard, Campaigns, My Images, Eligibility, Loans
- Updated page.tsx: replaced VideoPlatformScreen with MissionsScreen, changed video tab to missions tab
- Updated store.ts: removed video fields, added mission fields, added formatCfa helper
- Updated all wallet/finance references from video to mission
- Seeded 2 demo campaigns (Mercedes, Immobilier Dakar)

Stage Summary:
- Video section fully replaced with Espace Jeunes mission system
- 25 FCFA per validated image, 10 images/day limit
- Loan eligibility: 5000 FCFA (need 2500F funds + 5000F caution + 5 referrals) and 10000 FCFA (need 5000F + 5000F + 10 referrals)
- AI validation via z-ai-web-dev-sdk VLM + image hash similarity detection
- Site responds with HTTP 200, campaigns API returns demo data
