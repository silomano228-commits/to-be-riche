import { db } from '@/lib/db';
import { ensureSiteConfig } from '@/lib/site-config';
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

    const config = await ensureSiteConfig();

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

    const { adminTrxAddress, adminYasAccount, trxUsdPrice, cfaUsdRate } = await request.json();

    const config = await db.siteConfig.upsert({
      where: { id: 'main' },
      update: {
        ...(adminTrxAddress !== undefined ? { adminTrxAddress: adminTrxAddress.trim() } : {}),
        ...(adminYasAccount !== undefined ? { adminYasAccount: adminYasAccount.trim() } : {}),
        ...(trxUsdPrice !== undefined ? { trxUsdPrice: parseFloat(trxUsdPrice) } : {}),
        ...(cfaUsdRate !== undefined ? { cfaUsdRate: parseFloat(cfaUsdRate) } : {}),
      },
      create: { id: 'main', adminTrxAddress: adminTrxAddress?.trim() || 'TRMJ5R1cKbrMLy19PLu9rVtVGc5Ff2ZrHY', adminYasAccount: adminYasAccount?.trim() || '90876459', trxUsdPrice: parseFloat(trxUsdPrice) || 0.12, cfaUsdRate: parseFloat(cfaUsdRate) || 600 },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
