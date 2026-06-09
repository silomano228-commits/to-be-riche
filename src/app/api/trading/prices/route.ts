import { NextResponse } from 'next/server';
import { BASE_PRICES, getSimulatedPrice, getToken } from '@/lib/trading/helpers';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const prices = Object.entries(BASE_PRICES).map(([asset, info]) => {
      const currentPrice = getSimulatedPrice(asset);
      const change = currentPrice - info.base;
      const changePercent = (change / info.base) * 100;

      return {
        asset,
        price: currentPrice,
        basePrice: info.base,
        change: Math.round(change * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals),
        changePercent: Math.round(changePercent * 100) / 100,
        decimals: info.decimals,
      };
    });

    return NextResponse.json({
      success: true,
      prices,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
