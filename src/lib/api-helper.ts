import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  balance: number;
  investBalance: number;
  tradeBalance: number;
  projectBalance: number;
  hasInvested: boolean;
  role: string;
  depositCount: number;
  emailVerified: boolean;
  totalProfit: number;
  totalLoss: number;
  createdAt: string;
  updatedAt: string;
}

export function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  balance: number;
  investBalance: number;
  tradeBalance: number;
  projectBalance: number;
  hasInvested: boolean;
  role: string;
  depositCount: number;
  emailVerified: boolean;
  totalProfit: number;
  totalLoss: number;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    balance: user.balance,
    investBalance: user.investBalance,
    tradeBalance: user.tradeBalance,
    projectBalance: user.projectBalance,
    hasInvested: user.hasInvested,
    role: user.role,
    depositCount: user.depositCount,
    emailVerified: user.emailVerified,
    totalProfit: user.totalProfit,
    totalLoss: user.totalLoss,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getUserFromCookie(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('br_token')?.value;
  if (!token) return null;

  // Anti-fraud (hidden): the br_token cookie now holds a sessionToken (not
  // user.id). Resolve the user by sessionToken first; fall back to id for
  // backward compat with legacy sessions. If the user has a sessionToken set
  // but the cookie holds a legacy user.id, the session was invalidated by a
  // newer login elsewhere → return null.
  const bySession = await db.user.findFirst({ where: { sessionToken: token } });
  if (bySession) return toSafeUser(bySession);

  const byId = await db.user.findUnique({ where: { id: token } });
  if (byId) {
    if (!byId.sessionToken) {
      // Legacy session (cookie = user.id, no sessionToken yet). Accept it;
      // the sessionToken will be minted on the next login.
      return toSafeUser(byId);
    }
    // sessionToken is set but the cookie holds user.id → invalidated session.
    return null;
  }

  return null;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' $';
}

export async function seedAdmin() {
  const existing = await db.user.findUnique({
    where: { email: 'silomano228@gmail.com' },
  });
  if (!existing) {
    await db.user.create({
      data: {
        email: 'silomano228@gmail.com',
        name: 'Admin',
        password: 'Admin@2024',
        role: 'admin',
        emailVerified: true,
      },
    });
  }
}
