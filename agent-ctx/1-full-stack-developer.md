---
Task ID: 1
Agent: full-stack-developer
Task: Build investment project system with per-project claiming

Work Log:
- Created /api/projects/claim-daily/route.ts - new API for per-project daily gain claiming
  - Accepts POST with { projectId }
  - Validates user owns project and project is active
  - Checks if this specific project was already claimed today (DailyGain for today's date)
  - Generates random daily rate between 7-15%
  - Calculates gain = project.amount * rate / 100
  - Creates DailyGain record, updates project dailyRate
  - Credits gain to user earnings and balance
  - Creates transaction record, updates lastClaimAt
- Created /api/gains/status/route.ts - new API for checking per-project claim status + history
  - Accepts GET with ?projectId= query param
  - Returns alreadyClaimedToday boolean for specific project
  - Returns last 5 daily gains for the project
- Updated /src/lib/store.ts
  - Added selectedProjectId: string | null to state
  - Added setSelectedProjectId action
  - clearUser now also clears selectedProjectId
- Updated /src/app/page.tsx (major changes):
  - Added CATEGORY_ICONS constant mapping categories to icons/colors
  - Added getCategoryIcon() helper function
  - Added ProjectsScreen component:
    - Header "Mes Projets" with back button to wallet
    - Dark gradient card showing total potential gains
    - Lists ALL user's active projects with category icons, invested amount, daily rate, potential gain
    - Clicking a project navigates to project-detail page
    - Empty state with "Investir" button
  - Added ProjectDetailScreen component:
    - Back button to projects list
    - Project header with category icon, name, invested amount, daily rate
    - "Gain du jour" card with potential gain and claim button
    - "Déjà réclamé" state if already claimed today
    - Project stats (invested, rate, category)
    - Claim history (last 5 daily gains)
    - Calls /api/projects/claim-daily for per-project claiming
  - Updated WalletScreen:
    - Replaced full Daily Gains Claim Card with simplified version
    - Shows total potential gain and "Voir mes projets" button
    - Removed claiming/claimSuccess state and handleClaimDailyGain function
  - Updated BottomNav:
    - Changed FAB from "Wallet" (fa-wallet) to "Projets" (fa-briefcase)
    - Changed nav item id from 'wallet' to 'projects'
  - Updated BeRichApp routing:
    - Added currentPage === 'projects' && <ProjectsScreen />
    - Added currentPage === 'project-detail' && <ProjectDetailScreen />
- ESLint passes clean (only pre-existing .dev-server.js errors)

Stage Summary:
- Per-project daily gain claiming system fully implemented
- Users can navigate into each project individually to claim its daily gains
- Each project tracks claim status independently
- Bottom nav FAB now goes to "Projets" instead of "Wallet"
- Existing global claim API (/api/gains/claim) still works for backward compatibility
- New API /api/gains/status provides per-project claim status and history
