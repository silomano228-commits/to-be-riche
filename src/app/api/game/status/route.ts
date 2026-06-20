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

// Wheel segments: 16 segments total
// 35% win rate means ~5-6 winning segments out of 16
// Rewards are small since min deposit is $5
export const WHEEL_SEGMENTS = [
  { label: '0,10 $', reward: 0.10, isWin: true, color: '#22C55E' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
  { label: '0,25 $', reward: 0.25, isWin: true, color: '#3B82F6' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
  { label: '0,15 $', reward: 0.15, isWin: true, color: '#22C55E' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
  { label: '0,50 $', reward: 0.50, isWin: true, color: '#8B5CF6' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
  { label: '0,10 $', reward: 0.10, isWin: true, color: '#22C55E' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
  { label: '0,30 $', reward: 0.30, isWin: true, color: '#F59E0B' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
  { label: '1,00 $', reward: 1.00, isWin: true, color: '#EF4444' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
  { label: '0,20 $', reward: 0.20, isWin: true, color: '#3B82F6' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#9CA3AF' },
];

// 6 winning segments out of 16 = 37.5% (close to 35%)
// To get exactly ~35%, we use weighted random below

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const todaySpins = await db.gameSpin.findMany({
      where: { userId: user.id, spinDate: today },
      orderBy: { spunAt: 'desc' },
    });

    const freeSpinsUsed = todaySpins.length;
    const DAILY_FREE_SPINS = 3;

    return NextResponse.json({
      success: true,
      segments: WHEEL_SEGMENTS,
      freeSpinsUsed,
      freeSpinsRemaining: Math.max(0, DAILY_FREE_SPINS - freeSpinsUsed),
      dailyFreeSpins: DAILY_FREE_SPINS,
      paidSpinCost: 0.50,
      todaySpins: todaySpins.slice(0, 10).map(s => ({
        betAmount: s.betAmount,
        winAmount: s.winAmount,
        result: s.result,
        spunAt: s.spunAt,
      })),
      totalWonToday: todaySpins.reduce((sum, s) => sum + s.winAmount, 0),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
