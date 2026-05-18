import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

// Updated: projects always win, tiered returns with max slightly below next tier's min
const ENTERPRISE_CONFIG: Record<string, {
  durationDays: number; minAmount: number; minReturn: number; maxReturn: number;
  categories: string[];
}> = {
  short: {
    durationDays: 5,
    minAmount: 5,
    minReturn: 15,
    maxReturn: 28,
    categories: ['Tech Startup', 'App Development', 'Digital Marketing'],
  },
  medium: {
    durationDays: 10,
    minAmount: 5,
    minReturn: 30,
    maxReturn: 48,
    categories: ['GreenEnergy Ltd', 'Logistics Corp', 'FoodChain Inc', 'Real Estate Fund'],
  },
  long: {
    durationDays: 20,
    minAmount: 5,
    minReturn: 50,
    maxReturn: 68,
    categories: ['BioTech Holdings', 'Aerospace Ventures', 'Infrastructure Group', 'Mining Corp'],
  },
  ultralong: {
    durationDays: 30,
    minAmount: 5,
    minReturn: 70,
    maxReturn: 95,
    categories: ['DeepTech Labs', 'Quantum Industries', 'Space Ventures', 'Neural AI Corp', 'Fusion Energy'],
  },
};

const PREFIXES = ['Alpha', 'Beta', 'Nova', 'Prime', 'Elite', 'Global', 'Vertex', 'Apex', 'Quantum', 'Stellar'];

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount } = body;

    if (!type || !amount) {
      return NextResponse.json({ success: false, error: 'Missing fields: type, amount' }, { status: 400 });
    }

    if (!['short', 'medium', 'long', 'ultralong'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid type. Must be short, medium, long, or ultralong.' }, { status: 400 });
    }

    const config = ENTERPRISE_CONFIG[type];
    const investAmount = Number(amount);

    if (isNaN(investAmount) || investAmount < config.minAmount) {
      return NextResponse.json({ success: false, error: `Minimum amount is $${config.minAmount}` }, { status: 400 });
    }

    if (user.projectBalance < investAmount) {
      return NextResponse.json({ success: false, error: `Transférez des fonds vers votre Compte de Projet depuis le Portefeuille` }, { status: 400 });
    }

    const now = new Date();
    const finishesAt = new Date(now.getTime() + config.durationDays * 24 * 60 * 60 * 1000);

    // Generate random enterprise name
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const category = config.categories[Math.floor(Math.random() * config.categories.length)];
    const enterpriseName = `${prefix} ${category}`;

    // Projects always succeed now (no crash)
    const status = 'active';

    const enterprise = await db.enterprise.create({
      data: {
        userId: user.id,
        name: enterpriseName,
        category: type,
        amount: investAmount,
        durationDays: config.durationDays,
        minReturn: config.minReturn,
        maxReturn: config.maxReturn,
        status,
        riskEvents: null,
        finishesAt,
      },
    });

    // Deduct from projectBalance
    await db.user.update({
      where: { id: user.id },
      data: {
        projectBalance: { decrement: investAmount },
      },
    });

    // Create transaction
    await db.transaction.create({
      data: {
        type: 'enterprise_create',
        amount: -investAmount,
        detail: `Projet créé: ${enterpriseName} ($${investAmount.toFixed(2)}) — ${config.durationDays} jours, +${config.minReturn}-${config.maxReturn}% de rendement`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      enterprise: {
        id: enterprise.id,
        name: enterprise.name,
        amount: enterprise.amount,
        category: enterprise.category,
        durationDays: enterprise.durationDays,
        minReturn: enterprise.minReturn,
        maxReturn: enterprise.maxReturn,
        status: enterprise.status,
        finishesAt: enterprise.finishesAt,
      },
      crashed: false,
      message: `Projet créé: ${enterpriseName} — $${investAmount.toFixed(2)} pour ${config.durationDays} jours (+${config.minReturn}-${config.maxReturn}% de rendement garanti).`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
