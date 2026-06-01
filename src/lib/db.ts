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

  // Local SQLite for development / self-hosted production
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// Always cache the PrismaClient instance to avoid creating multiple connections
// On Vercel serverless, each invocation is isolated anyway
// On self-hosted, this ensures connection reuse across requests
export const db = globalForPrisma.prisma ?? createPrismaClient()
globalForPrisma.prisma = db
