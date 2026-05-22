import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // Use Turso cloud database if configured (production/Vercel)
  if (tursoUrl && tursoToken) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSQL } = require('@prisma/adapter-libsql')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client')

      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      })
      const adapter = new PrismaLibSQL(libsql)
      console.log('✅ Connected to Turso database')
      return new PrismaClient({ adapter, log: ['error', 'warn'] })
    } catch (e) {
      console.error('❌ Turso connection failed, falling back to local SQLite:', e)
    }
  }

  // Local SQLite for development
  console.log('📦 Using local SQLite database')
  return new PrismaClient({ log: ['error', 'warn'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
