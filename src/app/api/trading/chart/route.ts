import { NextResponse } from 'next/server';
import { BASE_PRICES, getToken } from '@/lib/trading/helpers';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

// Timeframe duration in seconds
const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

function generateCandlestickData(
  basePrice: number,
  volatility: number,
  decimals: number,
  timeframe: string,
  count: number
) {
  const tfSeconds = TIMEFRAME_SECONDS[timeframe] || 60;
  const now = Date.now();

  // Seeded PRNG for consistent data within a time window
  const timeBucket = Math.floor(Date.now() / 30000);
  let seed = Math.round(basePrice * 1000) + timeBucket * 7 + count * 3;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const randNorm = () => {
    const u1 = Math.max(1e-10, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const candles: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[] = [];

  let price = basePrice;
  let vol = volatility / basePrice; // Convert to percentage volatility
  const baseVolume = 500 + basePrice * 10;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * tfSeconds * 1000;

    // Volatility clustering
    const volShock = randNorm() * 0.002;
    vol = Math.max(0.003, Math.min(0.025, vol * 0.94 + volShock + 0.008 * 0.06));

    // Mean reversion
    const meanReversion = (basePrice - price) / basePrice * 0.002;

    // Random walk
    const returnPct = meanReversion + randNorm() * vol;
    price = Math.max(basePrice * 0.7, Math.min(basePrice * 1.3, price * (1 + returnPct)));

    // Generate OHLC
    const intraVol = vol * 0.6;
    const open = price * (1 + randNorm() * intraVol * 0.3);
    const close = price * (1 + randNorm() * intraVol * 0.3);
    const high = Math.max(open, close) * (1 + Math.abs(randNorm()) * intraVol * 0.5);
    const low = Math.min(open, close) * (1 - Math.abs(randNorm()) * intraVol * 0.5);

    // Volume
    const moveSize = Math.abs(returnPct) / vol;
    const volMultiplier = 1 + moveSize * 1.5 + rand() * 0.5;
    const volume = Math.round(baseVolume * volMultiplier * (0.6 + rand() * 0.8));

    const roundTo = (n: number) =>
      Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);

    candles.push({
      time: Math.floor(time / 1000), // Unix timestamp in seconds
      open: roundTo(open),
      high: roundTo(high),
      low: roundTo(low),
      close: roundTo(close),
      volume,
    });
  }

  return candles;
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const asset = url.searchParams.get('asset') || 'EUR/USD';
    const timeframe = url.searchParams.get('timeframe') || '5m';
    const count = Math.min(200, Math.max(10, parseInt(url.searchParams.get('count') || '60')));

    const info = BASE_PRICES[asset];
    if (!info) {
      return NextResponse.json(
        { success: false, error: `Invalid asset. Valid: ${Object.keys(BASE_PRICES).join(', ')}` },
        { status: 400 }
      );
    }

    if (!TIMEFRAME_SECONDS[timeframe]) {
      return NextResponse.json(
        { success: false, error: `Invalid timeframe. Valid: ${Object.keys(TIMEFRAME_SECONDS).join(', ')}` },
        { status: 400 }
      );
    }

    const candles = generateCandlestickData(
      info.base,
      info.volatility,
      info.decimals,
      timeframe,
      count
    );

    // Current price info
    const lastCandle = candles[candles.length - 1];
    const firstCandle = candles[0];
    const change = lastCandle.close - firstCandle.open;
    const changePercent = (change / firstCandle.open) * 100;

    return NextResponse.json({
      success: true,
      asset,
      timeframe,
      count,
      candles,
      currentPrice: lastCandle.close,
      change: Math.round(change * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals),
      changePercent: Math.round(changePercent * 100) / 100,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
