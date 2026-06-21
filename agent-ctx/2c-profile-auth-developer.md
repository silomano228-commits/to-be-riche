# Task ID: 2c — Frontend Developer (Profile + Auth)

## Task
- Part 1: Add native share sheet (Web Share API) + custom fallback modal to ProfileScreen.tsx
- Part 2: Add "communication platform for large companies" mention to AuthScreen.tsx

## Files Changed
- `src/components/screens/ProfileScreen.tsx`
- `src/components/screens/AuthScreen.tsx`

## Summary
### ProfileScreen.tsx
- New state: `shareSheetOpen` (boolean) controlling the custom fallback modal.
- New helper consts/functions:
  - `shareUrl` — `window.location.origin` (SSR-safe fallback `https://beriche.duckdns.org`).
  - `buildShareText()` — "Rejoins Be Rich et gagne de l'argent ! Utilise mon code: {code}. Inscris-toi: {url}".
  - `handleShare()` — tries `navigator.share()` first (mobile); on AbortError returns silently; on other failure or when `navigator.share` is undefined, opens the custom share sheet modal.
  - `openShareUrl(url, label)` — opens share URL (new tab for https, `window.open(url,'_self')` for sms:/mailto:) + toast.
  - `handleShareVia(platform)` — dispatches to: WhatsApp, WhatsApp Business, Telegram, Facebook, SMS, TikTok/Instagram/Snapchat (copy-link + open app), or "copy".
  - `copyLinkOnly()` / `copyLinkThenOpen(platform)` — clipboard with textarea polyfill fallback.
- New custom share sheet modal (bottom-sheet on mobile, centered on desktop) with:
  - Header "Partager Be Rich" + close button
  - Referral-link preview (truncated, monospace)
  - 8-platform grid (brand-colored circular icons): WhatsApp, WhatsApp Business, Telegram, Facebook, TikTok, Instagram, Snapchat, SMS
  - "Copier le lien" action button with confirmation feedback
- Removed the "Investissement" account card showing `user.investBalance`. Account grid changed from 4 cols × 2 to 3 cols × 1: Principal (balance), Trading, Projet.
- Kept `handleCopyCode` (clipboard copy of just the referral code) and the existing referral-code display card.

### AuthScreen.tsx
- Added a subtle gold pill badge + caption block between the BE RICH heading/subtitle and the Connexion/Inscription tab switcher (so it shows on BOTH views):
  - Badge: globe icon + "Plateforme de communication des grandes entreprises"
  - Caption: "Regardez des vidéos d'entreprises chinoises, japonaises et indiennes — soyez payés !"
- Did NOT change: background color (#0B1120), logo, gradient title, tab switcher, forms, layout.

## Lint / Type Check
- `bun run lint`: clean for both files (only pre-existing errors remain in scripts/*.js + .dev-server.js).
- `npx tsc --noEmit`: no errors in ProfileScreen.tsx or AuthScreen.tsx.

## Notes for Downstream Agents
- The custom share sheet uses the existing `slideUp` keyframe (already defined in ProfileScreen's `<style>` block).
- The `shareUrl` is computed inline (not via useState) to avoid the `react-hooks/set-state-in-effect` rule.
- `window.location.href` is NOT assigned directly (lint rule `react-hooks/immutability` forbids it); SMS/mailto: links use `window.open(url, '_self')` instead.
- `user.investBalance` is still declared in `src/lib/store.ts` (AppUser interface) — only the UI display was removed, not the type. Downstream agents may safely remove the type field if no other consumer remains.
