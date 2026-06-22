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

// Wheel segments: 20 segments with many elements for visual richness.
// Win amounts calibrated for $5 minimum deposit.
export const WHEEL_SEGMENTS = [
  { label: '$0.10', reward: 0.10, isWin: true, color: '#22C55E' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.20', reward: 0.20, isWin: true, color: '#14B8A6' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.50', reward: 0.50, isWin: true, color: '#F59E0B' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.10', reward: 0.10, isWin: true, color: '#22C55E' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.30', reward: 0.30, isWin: true, color: '#84CC16' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$1.00', reward: 1.00, isWin: true, color: '#EF4444' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.20', reward: 0.20, isWin: true, color: '#14B8A6' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.80', reward: 0.80, isWin: true, color: '#F97316' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.10', reward: 0.10, isWin: true, color: '#22C55E' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
  { label: '$0.30', reward: 0.30, isWin: true, color: '#84CC16' },
  { label: 'Perdu', reward: 0, isWin: false, color: '#475569' },
];

export const DAILY_SPINS = 10;

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Reset spins if date changed
    if (user.gameSpinsDate !== today) {
      await db.user.update({
        where: { id: user.id },
        data: { gameSpinsUsed: 0, gameSpinsDate: today, gameTotalWon: 0 },
      });
    }

    const todaySpins = await db.gameSpin.findMany({
      where: { userId: user.id, spinDate: today },
      orderBy: { spunAt: 'desc' },
    });

    const spinsUsed = user.gameSpinsDate === today ? user.gameSpinsUsed : 0;

    return NextResponse.json({
      success: true,
      segments: WHEEL_SEGMENTS,
      spinsUsed,
      spinsRemaining: Math.max(0, DAILY_SPINS - spinsUsed),
      dailySpins: DAILY_SPINS,
      todaySpins: todaySpins.slice(0, 10).map(s => ({
        betAmount: s.betAmount,
        winAmount: s.winAmount,
        result: s.result,
        spunAt: s.spunAt,
      })),
      totalWonToday: user.gameSpinsDate === today ? user.gameTotalWon : 0,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
