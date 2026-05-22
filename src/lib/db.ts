import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// In production (Vercel): upgrade to Turso cloud database
if (process.env.NODE_ENV === 'production' && process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  // Dynamic import - only runs in production, Turbopack is not used in prod builds
  import('@prisma/adapter-libsql').then(({ PrismaLibSQL }) => {
    return import('@libsql/client').then(({ createClient }) => {
      const libsql = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      })
      const adapter = new PrismaLibSQL(libsql)
      const tursoClient = new PrismaClient({ adapter, log: ['error', 'warn'] })
      globalForPrisma.prisma = tursoClient
      console.log('✅ Connected to Turso database')
    })
  }).catch((e) => {
    console.error('❌ Turso connection failed:', e)
  })
}
