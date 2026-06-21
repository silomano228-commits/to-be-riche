// next-keeper is disabled — app-server manages Next.js on port 3000.
// This file is intentionally a no-op to prevent port conflicts (EADDRINUSE).

console.log('[next-keeper] DISABLED — app-server manages Next.js on port 3000.');

setInterval(() => {
  // heartbeat to keep process alive without starting Next.js
}, 60000);
