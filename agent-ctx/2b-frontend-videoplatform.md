# Task ID 2b — Frontend Developer (VideoPlatformScreen)

## Task
Rewrite /home/z/my-project/src/components/screens/VideoPlatformScreen.tsx:
- Remove deposit (video account funded only by watching) — keep ONLY the "Retirer" button.
- All 5 videos visible at once via a 2-column grid.
- Add a growing earnings progress meter (green bar that fills + sliding coin icon) in the video balance card.
- $1 minimum withdrawal (was $5).
- Better inline + toast error messages for withdrawal failures (incl. depositRequired case).
- 3-day cycle warning banner with "Aller à Make Money" + "Inviter des amis" buttons.
- Keep existing features: YouTube embed (no seek/scroll), always-visible Quit button, congratulations modal, share sheet, 5-video daily stats, teal palette, mobile-first.

## Outcome
- File rewritten (~660 lines).
- All 7 requirements delivered.
- Lint: 0 new errors (8 pre-existing in .dev-server.js + scripts/* only).
- tsc --noEmit: 0 errors in VideoPlatformScreen.tsx (after fixing the addToast prop type to match the store's required-type signature).
- Dev server compiles cleanly: GET / 200, GET /api/videos/list 200.

## Key Implementation Notes for Future Agents
- The earnings progress meter uses `DAILY_MAX_EARN = 1.1` (5 videos × ~$0.22). Adjust if reward per video changes.
- VideoThumbnail sub-component fetches `https://img.youtube.com/vi/{id}/mqdefault.jpg` and falls back to a colored block on error.
- VideoWithdrawModal is now a bottom-sheet on mobile (items-end sm:items-center) and shows inline errors from the backend — submit button is always enabled (unless loading) so users see real error messages rather than just a disabled state.
- 3-day cycle banner is rendered ONLY when `videoDepositRequired === true`. It shows the two requirements (Level 1 investment + N referrals) with checkmark/xmark icons based on `hasLevel1Investment` and `referralCount >= requiredReferrals`.
- The `setPage('home')` call sends users to the Make Money screen (home) when they tap "Aller à Make Money".
