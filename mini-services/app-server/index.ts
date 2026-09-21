// app-server is disabled — the main dev server is managed by .zscripts/dev.sh
// (Next.js on port 3000). This file is intentionally a no-op to prevent port
// conflicts (EADDRINUSE) and duplicate Next.js processes in this environment.
// Re-enable by restoring the previous version from git history if needed.

console.log('[app-server] DISABLED — Next.js is managed by .zscripts/dev.sh on port 3000.');

setInterval(() => {
  // heartbeat to keep process alive without starting Next.js
}, 60000);
