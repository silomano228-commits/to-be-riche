// This script creates a .env file with DATABASE_URL if it doesn't exist
// This is needed for Prisma to find the DATABASE_URL at runtime
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

// Check if .env exists and has DATABASE_URL
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  if (content.includes('DATABASE_URL=')) {
    console.log('✅ .env already has DATABASE_URL');
    process.exit(0);
  }
}

// Create or append DATABASE_URL
const dbUrl = process.env.DATABASE_URL || 'file:./db/local.db';
const line = `\nDATABASE_URL=${dbUrl}\n`;

if (fs.existsSync(envPath)) {
  fs.appendFileSync(envPath, line);
} else {
  fs.writeFileSync(envPath, line);
}

console.log(`✅ Added DATABASE_URL=${dbUrl} to .env`);
