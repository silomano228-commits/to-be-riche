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

async function checkAdmin(request: Request) {
  const token = getToken(request);
  if (!token) return { error: NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 }), admin: null };
  const admin = await db.user.findUnique({ where: { id: token } });
  if (!admin || admin.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin };
}

// GET — Récupère la config du site
export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    let config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    if (!config) {
      config = await db.siteConfig.create({ data: { id: 'main', adminTrxAddress: '', trxUsdPrice: 0.12 } });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST — Met à jour la config
export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const { adminTrxAddress, trxUsdPrice } = await request.json();

    const config = await db.siteConfig.upsert({
      where: { id: 'main' },
      update: {
        ...(adminTrxAddress !== undefined ? { adminTrxAddress: adminTrxAddress.trim() } : {}),
        ...(trxUsdPrice !== undefined ? { trxUsdPrice: parseFloat(trxUsdPrice) } : {}),
      },
      create: { id: 'main', adminTrxAddress: adminTrxAddress?.trim() || '', trxUsdPrice: parseFloat(trxUsdPrice) || 0.12 },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
