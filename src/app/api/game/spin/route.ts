import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { WHEEL_SEGMENTS, DAILY_SPINS } from '../status/route';

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

// Win rate: 30-60% overall, but usually under 45%.
// Strategy: bias toward lower end. Each spin: base 38% chance to win,
// but if the user has won a lot today, reduce the chance; if they've lost
// a lot, slightly increase it. This keeps the overall rate in 30-60% range.
function shouldWin(spinsUsedToday: number, winsSoFar: number): boolean {
  // Base win probability biased low (target ~40% overall, usually <45%)
  let baseProbability = 0.40;
  // If user already won many times, lower the probability (toward 30%)
  if (winsSoFar >= 4) baseProbability = 0.30;
  else if (winsSoFar >= 3) baseProbability = 0.35;
  // If user is on a losing streak (many spins, few wins), boost toward 60%
  if (spinsUsedToday >= 6 && winsSoFar <= 1) baseProbability = 0.55;
  else if (spinsUsedToday >= 8 && winsSoFar <= 2) baseProbability = 0.60;
  return Math.random() < baseProbability;
}

function pickSegment(isWin: boolean): number {
  if (isWin) {
    const winningIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin ? i : -1))
      .filter((i) => i >= 0);
    return winningIndices[Math.floor(Math.random() * winningIndices.length)];
  }
  const losingIndices = WHEEL_SEGMENTS
    .map((s, i) => (!s.isWin ? i : -1))
    .filter((i) => i >= 0);
  return losingIndices[Math.floor(Math.random() * losingIndices.length)];
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Reset if date changed
    let spinsUsed = user.gameSpinsUsed;
    let totalWon = user.gameTotalWon;
    if (user.gameSpinsDate !== today) {
      spinsUsed = 0;
      totalWon = 0;
    }

    // Daily limit: 10 free spins, resets next day
    if (spinsUsed >= DAILY_SPINS) {
      return NextResponse.json({
        success: false,
        dailyLimitReached: true,
        error: 'Limite quotidienne atteinte (10 tours). Revenez demain !',
      }, { status: 400 });
    }

    // Count wins today from gameSpins
    const todaySpins = await db.gameSpin.findMany({
      where: { userId: user.id, spinDate: today },
    });
    const winsSoFar = todaySpins.filter((s) => s.result === 'win').length;

    const isWin = shouldWin(spinsUsed, winsSoFar);
    const segmentIdx = pickSegment(isWin);
    const segment = WHEEL_SEGMENTS[segmentIdx];
    const winAmount = segment.reward;

    await db.$transaction(async (tx) => {
      await tx.gameSpin.create({
        data: {
          userId: user.id,
          betAmount: 0,
          winAmount,
          result: isWin ? 'win' : 'loss',
          segmentIdx,
          spinDate: today,
        },
      });

      if (isWin && winAmount > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: winAmount },
            gameTotalWon: { increment: winAmount },
          },
        });
        await tx.transaction.create({
          data: {
            type: 'game_win',
            amount: winAmount,
            detail: `Gain roue de la fortune: ${segment.label}`,
            userId: user.id,
          },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            gameSpinsUsed: { increment: 1 },
            gameSpinsDate: today,
            gameLastSpinAt: new Date(),
          },
        });
      }
    });

    // Re-fetch user for accurate balance
    const updatedUser = await db.user.findUnique({ where: { id: user.id } });

    const newSpinsUsed = spinsUsed + 1;
    const spinsRemaining = Math.max(0, DAILY_SPINS - newSpinsUsed);

    return NextResponse.json({
      success: true,
      segmentIdx,
      segment: { label: segment.label, reward: segment.reward, color: segment.color, isWin },
      isWin,
      winAmount,
      spinsUsed: newSpinsUsed,
      spinsRemaining,
      newBalance: updatedUser?.balance ?? user.balance,
      message: isWin
        ? `Félicitations ! Vous avez gagné $${winAmount.toFixed(2)} à la roue !`
        : 'Vous n\'avez pas gagné cette fois-ci. Réessayez !',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
