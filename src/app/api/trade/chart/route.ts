import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (!match) return null;
  return match[1];
}

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

// ==================== REALISTIC PRICE GENERATOR ====================

/**
 * Generates realistic financial price data using:
 * - Geometric Brownian Motion for trend
 * - Mean reversion for stability
 * - Micro-structure noise for realism
 * - Volatility clustering (GARCH-like)
 * - Smooth interpolation between points
 */
function generateRealisticChart(basePrice: number, points: number, seed: number) {
  // Simple seeded PRNG for consistent data between refreshes
  let s = seed;
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  const randNorm = () => {
    // Box-Muller transform
    const u1 = Math.max(1e-10, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const data: { time: number; price: number; volume: number; open: number; high: number; low: number; close: number }[] = [];
  let price = basePrice;
  let volatility = 0.008; // Base volatility
  const now = Date.now();
  const baseVolume = 500 + basePrice * 10;

  // Generate micro-trend phases for realistic movement
  const trendPhase = rand() * Math.PI * 2;
  const trendStrength = (rand() - 0.5) * 0.003;

  for (let i = 0; i < points; i++) {
    // Volatility clustering: volatility tends to persist
    const volShock = randNorm() * 0.002;
    volatility = Math.max(0.003, Math.min(0.025, volatility * 0.94 + volShock + 0.008 * 0.06));

    // Trend component with cyclical behavior
    const cyclicalTrend = Math.sin(trendPhase + i * 0.05) * trendStrength;

    // Mean reversion: pull price back towards base
    const meanReversion = (basePrice - price) / basePrice * 0.002;

    // Random walk component
    const randomWalk = randNorm() * volatility;

    // Combine all components
    const returnPct = cyclicalTrend + meanReversion + randomWalk;
    price = Math.max(basePrice * 0.7, Math.min(basePrice * 1.3, price * (1 + returnPct)));

    // Generate OHLC within the price movement
    const intraVol = volatility * 0.6;
    const open = price * (1 + randNorm() * intraVol * 0.3);
    const close = price * (1 + randNorm() * intraVol * 0.3);
    const high = Math.max(open, close) * (1 + Math.abs(randNorm()) * intraVol * 0.5);
    const low = Math.min(open, close) * (1 - Math.abs(randNorm()) * intraVol * 0.5);

    // Volume with clustering (higher volume during bigger moves)
    const moveSize = Math.abs(returnPct) / volatility;
    const volMultiplier = 1 + moveSize * 1.5 + rand() * 0.5;
    const volume = Math.round(baseVolume * volMultiplier * (0.6 + rand() * 0.8));

    data.push({
      time: now - (points - i) * 60000,
      price: Math.round(close * 100) / 100,
      volume,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    });
  }

  return data;
}

// Market assets
const MARKET_ASSETS = [
  { id: 'brx', name: 'BRX Token', basePrice: 52.30, emoji: '🪙' },
  { id: 'ntc', name: 'NovaTech Coin', basePrice: 128.45, emoji: '⚡' },
  { id: 'gld', name: 'GoldFund ETF', basePrice: 85.20, emoji: '🥇' },
  { id: 'eng', name: 'EnergyPlus Index', basePrice: 34.67, emoji: '🔋' },
];

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const assetId = url.searchParams.get('asset') || 'brx';
    const points = Math.min(200, Math.max(60, parseInt(url.searchParams.get('points') || '120')));

    const asset = MARKET_ASSETS.find(a => a.id === assetId) || MARKET_ASSETS[0];

    // Seed changes every 5 minutes for data consistency within that window
    // but gives fresh data periodically
    const timeBucket = Math.floor(Date.now() / 300000);
    const seed = Math.round(asset.basePrice * 1000) + timeBucket * 7;

    const chartData = generateRealisticChart(asset.basePrice, points, seed);

    // Compute stats
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];
    const change = lastPoint.price - firstPoint.price;
    const changePercent = (change / firstPoint.price) * 100;

    // 24h high/low
    const high24h = Math.max(...chartData.map(d => d.high));
    const low24h = Math.min(...chartData.map(d => d.low));

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        emoji: asset.emoji,
        currentPrice: lastPoint.price,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        high24h: Math.round(high24h * 100) / 100,
        low24h: Math.round(low24h * 100) / 100,
      },
      data: chartData,
      assets: MARKET_ASSETS.map(a => ({ id: a.id, name: a.name, emoji: a.emoji })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
