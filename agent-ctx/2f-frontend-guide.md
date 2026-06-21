# Task 2f — Frontend Developer (GuideScreen)

## Task
Rewrite `/home/z/my-project/src/components/screens/GuideScreen.tsx` so that the in-app Guide reflects ALL the current Be Rich business rules (3 invest levels @ 5%/day, $1 video withdrawal, no video deposit, no investBalance, 3-day video cycle requiring Niveau 1 investment + referrals, radial wheel text + STOP button, 46 ads / 6 layouts, 4 tabs with Finance removed, etc.).

## Approach
- Read worklog entries 10-foundation + 2a + 2b + 2c + 2d + 2e to lock in the latest contracts.
- Read the full 557-line GuideScreen.tsx — accordion structure (8 sections, multi-open Set<SectionId>, smooth grid-rows animation) is solid; kept it intact.
- Confirmed `INVEST_LEVELS` from `@/components/shared` already returns the correct 3-level array, so the `.map()` in InvestContent auto-renders the right levels — only the surrounding copy needed fixing.
- Performed 13 surgical MultiEdits (no full rewrite) — see worklog.md "Task ID: 2f" for the full per-edit log.

## Files modified
- `src/components/screens/GuideScreen.tsx` (557 → 588 lines)

## Key content updates per section
1. **Vidéos**: no deposit on video account (funded ONLY by watching), $1 withdrawal minimum, 5 videos visible at once (2-col grid), green progress bar that grows normally, X rouge + "Quitter la vidéo" button, 3-day rule now applies to WITHDRAWALS (not watching) and requires Niveau 1 investment + 1+ referrals with per-cycle increase, admin can add video links.
2. **Investissement**: 3 niveaux (not 4), 5%/jour (not 10%), unlimited collection AND unlimited number of investments, direct YAS/TRX deposit at all levels, NO investBalance, claim via YAS/TRX ($5 min) or main account (no min), unlock by referrals only (12 for L2, 25 for L3) — no previous-level requirement.
3. **Jeu**: 10 tours/jour, 30-60% (généralement <45%), $0.10-$1.00, compte principal, NEW "Texte lisible (radial)" row + NEW "Bouton ARRÊTER" row, popup félicitations avec confettis.
4. **Compte Principal**: game gains + small collections (<$5), $5 min deposit/withdrawal YAS/TRX, 6h.
5. **Méthodes de Paiement**: YAS + TRX, differentiated minimums ($5 principal / $1 vidéo / $5 gain for invest collect), 6h.
6. **Parrainage**: BR-XXXXX, native share, 12 (Niv.2) / 25 (Niv.3), 3-day video rule with per-cycle increase.
7. **Publicités**: 46 entreprises, 6 layouts visuels distincts (hero/split/banner/card/quote/stats), fermables avec X.
8. **Navigation**: 4 onglets (Vidéos, Make Money, Guide, Profil), Finance supprimé — already correct, untouched.
- Hero card text: added "coréennes, américaines et européennes" alongside "chinoises, japonaises et indiennes".
- SECTIONS summaries all updated to match new rules.

## Lint / TypeScript
- `bun run lint`: 8 errors total — ALL pre-existing in `.dev-server.js` + `scripts/*.js` (no-require-imports rule). **Zero new errors** in GuideScreen.tsx.
- `npx tsc --noEmit`: **Zero errors** mentioning GuideScreen.tsx. The ~14 remaining TS errors are all pre-existing in other files.

## Issues
None. The accordion, reusable pieces (Pill, SubHead, Row, Callout, StatRow), Header, hero, and footer security reminder were all preserved. 'use client' + useState<Set<SectionId>> kept. Green/teal palette preserved, no blue/indigo introduced.
