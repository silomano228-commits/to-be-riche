import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // Use Turso cloud database if configured (production/Vercel)
  if (tursoUrl && tursoToken) {
    try {
      // Prisma 6.x: PrismaLibSQL is a FACTORY - pass config object, not client instance
      const adapter = new PrismaLibSQL({
        url: tursoUrl,
        authToken: tursoToken,
      })
      return new PrismaClient({ adapter } as any)
    } catch (e) {
      console.error('❌ Turso connection failed:', e)
      throw e
    }
  }

  // Local SQLite for development
  return new PrismaClient()
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
