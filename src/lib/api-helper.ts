import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  balance: number;
  invested: number;
  earnings: number;
  hasInvested: boolean;
  role: string;
  depositCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  balance: number;
  invested: number;
  earnings: number;
  hasInvested: boolean;
  role: string;
  depositCount: number;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    balance: user.balance,
    invested: user.invested,
    earnings: user.earnings,
    hasInvested: user.hasInvested,
    role: user.role,
    depositCount: user.depositCount,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getUserFromCookie(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('br_token')?.value;
  if (!token) return null;

  const user = await db.user.findUnique({
    where: { id: token },
  });

  if (!user) return null;
  return toSafeUser(user);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' $';
}

export async function seedAdmin() {
  const existing = await db.user.findUnique({
    where: { email: 'admin@berich.com' },
  });
  if (!existing) {
    await db.user.create({
      data: {
        email: 'admin@berich.com',
        name: 'Admin',
        password: 'Admin@2024',
        role: 'admin',
      },
    });
  }
}
