# Fix Missions/Tâches Module — Work Record

## Task ID: fix-missions-module
## Agent: main
## Date: 2026-09-20

## Summary
Fixed and restructured the Missions/Tâches module in the Next.js project. All 5 tasks completed successfully.

## Changes Made

### TASK 1: Renamed "Missions" → "Tâches" in UI
**File: `/src/app/page.tsx`**
- Line 224: "Missions rémunérées" → "Tâches rémunérées"
- Line 348: "Réalisez des missions" → "Réalisez des tâches"
- Line 511: Balance card label "Missions" → "Tâches"
- Line 513: Button text "Missions" → "Tâches"
- Line 549: Quick action label "Missions" → "Tâches"
- Line 663: Account label "Compte Missions" → "Compte Tâches"
- Line 669: Account label helper "Missions" → "Tâches"
- Line 767: Card title "Compte Missions" → "Compte Tâches"
- Line 774: Button "Missions" → "Tâches"
- Line 820: Stats label "Solde missions" → "Solde tâches"
- Line 976: Bottom nav "Missions" → "Tâches"
- Internal route names (`'missions'`) kept unchanged

**File: `/src/components/screens/MissionsScreen.tsx`**
- Sub-tab label "Missions" → "Tâches" (line 151)
- Dashboard "Solde missions" → "Solde tâches"
- "De nouvelles missions arriveront bientôt" → "De nouvelles tâches arriveront bientôt"
- "Postez votre première image dans une mission" → "...dans une tâche"
- "Gains missions" → "Gains tâches" in eligibility view

### TASK 2: Fixed Missions tab content
- Added auto-seed function `ensureCampaigns()` in `/src/app/api/missions/campaigns/route.ts`
- When campaigns endpoint is called and no campaigns exist, 3 sample campaigns are auto-created
- This ensures the tab always shows content even if seed hasn't been called
- Verified API endpoint returns 3 active campaigns successfully

### TASK 3: Fixed UPLOAD flow (not generate)
- Changed "Uploader mon image" → "Importer mon image" (upload button)
- Changed "Envoi en cours..." → "Analyse en cours..." (loading state)
- Changed "Image envoyée ! Validation IA en cours..." → "Image importée ! Analyse IA en cours..."
- Updated instructions: "Uploadez-la ici" → "Importez-la ici"
- Changed all "DALL-E" references → "Gemini" (to match modern AI tools)
- Changed "Générez une image" → "Créez une image" in instructions
- Updated "Uploadez-les ici" → "Importez-les ici" in campaign tips
- No "generate" button or prompt input exists — confirmed correct

### TASK 4: Sample campaigns auto-seed
- Added 3 sample campaigns in `/src/app/api/missions/campaigns/route.ts`:
  1. Immobilier Royale (immobilier, 16:9, realistic)
  2. Mercedes (automobile, 16:9, realistic)
  3. Louis Vuitton (mode, 4:3, artistic)
- Auto-seed triggers when `GET /api/missions/campaigns` finds 0 campaigns
- Each campaign: +25 FCFA/image, 10/day limit, 90-day duration

### TASK 5: Enhanced Dashboard sub-tab
- Added user level display in balance card with:
  - Level indicator bar (1-4 segments)
  - Level badge with color coding: Nouveau (gray), Actif (amber), Éligible (green), Fiable (blue)
- Updated step descriptions in "Comment gagner de l'argent ?":
  - "mission"5→ "tâche", "Générez" → "Créez", "Uploadez" → "Importez"
- Changed rules: "Uploadez-les ici" → "Importez-les ici"

## API Verification
- `GET /api/health` → 200 OK
- `GET /api/missions/campaigns` → Returns 3 campaigns with success=true
- `GET /` → 200 OK (page renders)

## No Changes To
- Login/register flow
- Profile screen
- Other screens (Wallet, Invest, etc.)
- Database schema (already correct)
- Internal route names (kept as 'missions')
