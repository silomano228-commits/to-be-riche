// Ensure DATABASE_URL is set for Prisma internal validation
// When using Turso adapter, Prisma still validates this URL format
// even though it doesn't use it for actual queries
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./db/local.db'
}

import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // Use Turso cloud database if configured (production/Vercel)
  if (tursoUrl && tursoToken) {
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, log: ['error', 'warn'] })
  }

  // Local SQLite for development
  return new PrismaClient({ log: ['error', 'warn'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
