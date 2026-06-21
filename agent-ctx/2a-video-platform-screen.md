# Task 2a — VideoPlatformScreen update

## Goal
Update `/home/z/my-project/src/components/screens/VideoPlatformScreen.tsx` to:
1. Add an **always-visible Quit button** so anyone can quit the video at any moment.
2. Verify / harden the **no-scroll / no-seek YouTube player** (must watch ≥50% to claim).
3. Show today's earnings summary in the result modal.
4. Keep autonomous video account, deposit/withdraw (YAS/TRX), 3-day deposit rule, daily 5-video limit, green/teal UI, Font Awesome icons.

## API contract (from Task 9-backend)
- `GET /api/videos/list` returns `{ videos, watchedCount, remaining, totalEarnedToday, videoBalance, videoDepositRequired, daysWatching }`. Admin-managed links take priority over the daily catalog; titles come from admin and conform to video content. Each video has `source: 'admin'|'catalog'`.
- `POST /api/videos/reward` body `{ videoId, watchedPercent }` — requires `watchedPercent >= 50`.
- 3-day deposit rule: after 3 watching days `videoDepositRequired` becomes true → user must deposit (min $5 via YAS/TRX) before watching more.
- Autonomous `videoBalance` account with `/api/videos/deposit` and `/api/videos/withdraw` (both YAS or TRX, min $5).

## Changes made (surgical edits to VideoPlayerModal, no full rewrite)
1. **Header close button**: was conditional on `canClaim` (only after 50%). Replaced with ALWAYS-VISIBLE 44×44px red X button (top-right, `rgba(239,68,68,0.95)`, `aria-label="Quitter la vidéo"`, touch-friendly).
2. **Bottom quit button**: added a full-width "Quitter la vidéo" button below the Claim button — always visible at any moment (red outline style, `fas fa-times-circle`).
3. **No-seek hardening**: the YT IFrame API is already configured with `controls:0, disablekb:1, fs:0, iv_load_policy:3, modestbranding:1, rel:0, playsinline:1`. The `#yt-player` wrapper has `pointerEvents:'none'`. `preventScroll()` blocks wheel/touchmove. Anti-seeking interval resets playback if `currentTime` jumps > 2s forward. **Strengthened**: the transparent overlay above the iframe previously had `pointerEvents:'none'` (let clicks pass through); changed to default `pointerEvents:'auto'` so it CAPTURES all clicks and the iframe can never receive seek/pause/interact events.
4. **Result display**: updated `onReward` callback so the CongratulationsModal message now shows both the per-video reward AND today's cumulative earnings: `+$X.XX crédités sur votre compte vidéo. Total gagné aujourd'hui : $Y.YY.` Existing CongratulationsModal (confetti, trophy animation, OK + backdrop + Escape dismissal) verified working.
5. **Video titles**: confirmed `video.title` is displayed as-is. API (per Task 9-backend) returns proper admin-managed titles — no frontend change needed.

## Preserved features (unchanged)
- videoBalance card with deposit/withdraw buttons
- 3-day deposit warning banner (videoDepositRequired)
- daily limit stats (remaining/5, watchedCount, totalEarnedToday)
- VideoDepositModal & VideoWithdrawModal with YAS/TRX method selector and $5 min
- ShareModal with native share sheet (WhatsApp, TikTok, Instagram, Facebook, Telegram, Messenger)
- Font Awesome icons (`fas fa-*`, `fab fa-*`)
- green/teal color scheme (#14B8A6, #0F766E, #22C55E)
- mobile-first layout, touch-friendly (min 44px touch targets)
- imports: `authFetch` from `@/lib/store`, `CongratulationsModal` from `@/components/CongratulationsModal`, `Header` from `@/components/shared`

## Lint result
`bun run lint` produces 0 new errors in `VideoPlatformScreen.tsx`. 9 pre-existing errors exist in unrelated files (`.dev-server.js`, `scripts/*`, `ProfileScreen.tsx`) — not introduced by this task.

## Files touched
- `/home/z/my-project/src/components/screens/VideoPlatformScreen.tsx` (surgical edits only)
