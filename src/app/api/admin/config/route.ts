import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET — Récupère la config du site (adresse TRX admin, prix)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    let config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    if (!config) {
      config = await db.siteConfig.create({ data: { id: 'main', adminTrxAddress: '', trxUsdPrice: 0.12 } });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST — Met à jour la config (adresse TRX admin, prix)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

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
