#!/usr/bin/env node

/**
 * Post-build script for Next.js standalone deployment.
 *
 * When `output: 'standalone'` is used, Next.js does NOT copy:
 *   - .next/static/  (JS chunks, CSS, etc.)
 *   - public/        (manifest.json, icons, etc.)
 *
 * This script copies them into .next/standalone/ so the standalone server
 * can serve them correctly.
 *
 * Ref: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const staticSource = path.join(projectRoot, '.next', 'static');
const publicSource = path.join(projectRoot, 'public');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[standalone-setup] Source not found, skipping: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy .next/static → .next/standalone/.next/static
const staticDest = path.join(standaloneDir, '.next', 'static');
console.log('[standalone-setup] Copying .next/static → .next/standalone/.next/static');
copyDirSync(staticSource, staticDest);

// 2. Copy public → .next/standalone/public
const publicDest = path.join(standaloneDir, 'public');
console.log('[standalone-setup] Copying public → .next/standalone/public');
copyDirSync(publicSource, publicDest);

// 3. Copy Prisma schema + engine if needed (for runtime Prisma Client)
const prismaSource = path.join(projectRoot, 'prisma');
const prismaDest = path.join(standaloneDir, 'prisma');
if (fs.existsSync(prismaSource)) {
  console.log('[standalone-setup] Copying prisma → .next/standalone/prisma');
  copyDirSync(prismaSource, prismaDest);
}

// 4. Copy db folder if it exists (for SQLite database)
const dbSource = path.join(projectRoot, 'db');
const dbDest = path.join(standaloneDir, 'db');
if (fs.existsSync(dbSource)) {
  console.log('[standalone-setup] Copying db → .next/standalone/db');
  copyDirSync(dbSource, dbDest);
}

console.log('[standalone-setup] ✅ Done! Standalone deployment ready.');
