import { db } from '@/lib/db';
import { ensureSiteConfig } from '@/lib/site-config';
import { checkAdmin } from '@/app/api/admin/data/route';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const config = await ensureSiteConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const { adminTrxAddress, adminYasAccount, trxUsdPrice, cfaUsdRate, worldLink } = await request.json();

    const parsedTrxPrice = trxUsdPrice !== undefined ? parseFloat(trxUsdPrice) : undefined;
    const parsedCfaRate = cfaUsdRate !== undefined ? parseFloat(cfaUsdRate) : undefined;

    // Validate ranges
    if (parsedTrxPrice !== undefined && (isNaN(parsedTrxPrice) || parsedTrxPrice <= 0 || parsedTrxPrice > 10)) {
      return NextResponse.json({ success: false, error: 'Prix TRX invalide (doit être entre 0.01 et 10)' }, { status: 400 });
    }
    if (parsedCfaRate !== undefined && (isNaN(parsedCfaRate) || parsedCfaRate < 100 || parsedCfaRate > 10000)) {
      return NextResponse.json({ success: false, error: 'Taux CFA invalide (doit être entre 100 et 10000)' }, { status: 400 });
    }

    const config = await db.siteConfig.upsert({
      where: { id: 'main' },
      update: {
        ...(adminTrxAddress !== undefined ? { adminTrxAddress: String(adminTrxAddress).trim() } : {}),
        ...(adminYasAccount !== undefined ? { adminYasAccount: String(adminYasAccount).trim() } : {}),
        ...(parsedTrxPrice !== undefined ? { trxUsdPrice: parsedTrxPrice } : {}),
        ...(parsedCfaRate !== undefined ? { cfaUsdRate: parsedCfaRate } : {}),
        ...(worldLink !== undefined ? { worldLink: String(worldLink).trim() || null } : {}),
      },
      create: {
        id: 'main',
        adminTrxAddress: String(adminTrxAddress || 'TRMJ5R1cKbrMLy19PLu9rVtVGc5Ff2ZrHY').trim(),
        adminYasAccount: String(adminYasAccount || '90876459').trim(),
        trxUsdPrice: parsedTrxPrice || 0.12,
        cfaUsdRate: parsedCfaRate || 600,
        worldLink: String(worldLink || '').trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}