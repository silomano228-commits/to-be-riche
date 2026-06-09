import { NextResponse } from 'next/server';
import { BASE_PRICES, getSimulatedPrice, getBidAsk, getToken } from '@/lib/trading/helpers';
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
  count: number,
  currentLivePrice: number
) {
  const tfSeconds = TIMEFRAME_SECONDS[timeframe] || 60;
  const now = Date.now();

  // Seeded PRNG for consistent data within a short time window
  const timeBucket = Math.floor(Date.now() / 5000); // Refresh every 5s for faster updates
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

  let price = basePrice * (0.97 + rand() * 0.06); // Start near base
  let vol = volatility / basePrice;
  const baseVolume = 500 + basePrice * 10;

  // Generate trend phase for more realistic movement
  const trendPhase = rand() * Math.PI * 2;
  const trendStrength = (rand() - 0.5) * 0.003;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * tfSeconds * 1000;
    const progress = i / count;

    // Cyclical trend component
    const cycleTrend = Math.sin(trendPhase + progress * Math.PI * 2) * trendStrength;

    // Volatility clustering (GARCH-like)
    const volShock = randNorm() * 0.002;
    vol = Math.max(0.003, Math.min(0.025, vol * 0.94 + volShock + 0.008 * 0.06));

    // Mean reversion
    const meanReversion = (basePrice - price) / basePrice * 0.003;

    // Random walk with trend
    const returnPct = meanReversion + cycleTrend + randNorm() * vol;
    price = Math.max(basePrice * 0.7, Math.min(basePrice * 1.3, price * (1 + returnPct)));

    // Generate OHLC with realistic intra-candle movement
    const intraVol = vol * 0.7;
    const open = price * (1 + randNorm() * intraVol * 0.2);
    
    // More realistic wick generation
    const bodyDirection = rand() > 0.5 ? 1 : -1;
    const bodySize = Math.abs(randNorm()) * intraVol * 0.4;
    const close = open * (1 + bodyDirection * bodySize);
    
    const upperWick = Math.abs(randNorm()) * intraVol * 0.6;
    const lowerWick = Math.abs(randNorm()) * intraVol * 0.6;
    const high = Math.max(open, close) * (1 + upperWick);
    const low = Math.min(open, close) * (1 - lowerWick);

    // Volume with spikes
    const moveSize = Math.abs(returnPct) / vol;
    const volMultiplier = 1 + moveSize * 1.5 + rand() * 0.5;
    const volume = Math.round(baseVolume * volMultiplier * (0.6 + rand() * 0.8));

    const roundTo = (n: number) =>
      Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);

    candles.push({
      time: Math.floor(time / 1000),
      open: roundTo(open),
      high: roundTo(high),
      low: roundTo(low),
      close: roundTo(close),
      volume,
    });
  }

  // Replace the last candle with live data for the current period
  if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const currentPeriodStart = Math.floor(now / (tfSeconds * 1000)) * tfSeconds * 1000;
    
    if (lastCandle.time * 1000 >= currentPeriodStart - tfSeconds * 1000) {
      // This is the current live candle - update it with the real simulated price
      const liveOpen = lastCandle.open;
      const liveClose = currentLivePrice;
      const liveHigh = Math.max(lastCandle.high, liveClose);
      const liveLow = Math.min(lastCandle.low, liveClose);
      
      candles[candles.length - 1] = {
        ...lastCandle,
        close: liveClose,
        high: liveHigh,
        low: liveLow,
        volume: lastCandle.volume + Math.floor(Math.random() * 50),
      };
    }
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
    const timeframe = url.searchParams.get('timeframe') || '1m';
    const count = Math.min(200, Math.max(10, parseInt(url.searchParams.get('count') || '80')));

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

    // Get current live price for the last candle
    const currentLivePrice = getSimulatedPrice(asset);
    const bidAsk = getBidAsk(asset);

    const candles = generateCandlestickData(
      info.base,
      info.volatility,
      info.decimals,
      timeframe,
      count,
      currentLivePrice
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
      currentPrice: currentLivePrice,
      bid: bidAsk.bid,
      ask: bidAsk.ask,
      spread: bidAsk.spread,
      change: Math.round(change * Math.pow(10, info.decimals)) / Math.pow(10, info.decimals),
      changePercent: Math.round(changePercent * 100) / 100,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
