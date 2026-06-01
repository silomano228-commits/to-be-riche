import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Simple SQLite local — pas de Turso, pas de connexion distante
// La base est stockée dans le fichier défini par DATABASE_URL
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

// Toujours cacher l'instance pour réutiliser la connexion
globalForPrisma.prisma = db
