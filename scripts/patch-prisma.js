// Patch Prisma generated client to ensure DATABASE_URL is always resolved
// This fixes the "URL_INVALID: The URL 'undefined' is not in a valid format" error
// when using Turso adapter on Vercel where .env file doesn't exist

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.js');

if (!fs.existsSync(indexPath)) {
  console.log('Prisma client not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(indexPath, 'utf8');
let patched = false;

// Patch 1: Replace null value with fallback for DATABASE_URL
const nullPattern = '"fromEnvVar": "DATABASE_URL",\n        "value": null';
const fallbackValue = '"fromEnvVar": "DATABASE_URL",\n        "value": "file:./db/local.db"';

if (content.includes(nullPattern)) {
  content = content.replace(nullPattern, fallbackValue);
  patched = true;
  console.log('✅ Patched DATABASE_URL null value');
}

// Patch 2: Add process.env.DATABASE_URL fallback in env resolution
// Find the line where Prisma resolves env and add fallback
const envCheckPattern = 'config.dirname = __dirname';
if (content.includes(envCheckPattern)) {
  const envFallback = `config.dirname = __dirname
// PATCHED: Ensure DATABASE_URL is always available for Prisma
if (!process.env.DATABASE_URL) { process.env.DATABASE_URL = 'file:./db/local.db'; }`;
  content = content.replace(envCheckPattern, envFallback);
  patched = true;
  console.log('✅ Added DATABASE_URL process.env fallback');
}

if (patched) {
  fs.writeFileSync(indexPath, content);
  console.log('✅ Prisma client patched successfully');
} else {
  console.log('ℹ️  No patches needed (may already be patched or different format)');
}
