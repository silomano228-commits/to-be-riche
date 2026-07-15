import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
  { label: '$10.00', reward: 10.00, isWin: true, color: '#FCD34D' },
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
export const SPIN_COST = 0.20;

export async function GET(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (user.gameSpinsDate !== today) {
      await db.user.update({
        where: { id: user.id },
        data: { gameSpinsUsed: 0, gameSpinsDate: today },
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
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}