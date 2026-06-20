import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { WHEEL_SEGMENTS } from '../status/route';

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

const DAILY_FREE_SPINS = 3;
const PAID_SPIN_COST = 0.50;

// 35% win rate: weighted random selection
// Winning segments indices: 0, 2, 4, 6, 8, 10, 12, 14 (8 out of 16 = 50%)
// To get ~35% win rate, we use a two-step process:
// 1. First decide if it's a win (35% chance) or loss (65% chance)
// 2. If win, pick a random winning segment. If loss, pick a random losing segment.
function pickSegment(): { segmentIdx: number; isWin: boolean } {
  const isWin = Math.random() < 0.35;

  if (isWin) {
    const winningIndices = WHEEL_SEGMENTS
      .map((s, i) => s.isWin ? i : -1)
      .filter(i => i >= 0);
    const idx = winningIndices[Math.floor(Math.random() * winningIndices.length)];
    return { segmentIdx: idx, isWin: true };
  } else {
    const losingIndices = WHEEL_SEGMENTS
      .map((s, i) => !s.isWin ? i : -1)
      .filter(i => i >= 0);
    const idx = losingIndices[Math.floor(Math.random() * losingIndices.length)];
    return { segmentIdx: idx, isWin: false };
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { useFreeSpin } = body;
    const today = new Date().toISOString().slice(0, 10);

    // Check daily free spins used
    const todaySpinsCount = await db.gameSpin.count({
      where: { userId: user.id, spinDate: today },
    });

    const hasFreeSpin = todaySpinsCount < DAILY_FREE_SPINS;
    const isFree = useFreeSpin && hasFreeSpin;

    // If no free spin, user must pay
    if (!isFree) {
      if (user.balance < PAID_SPIN_COST) {
        return NextResponse.json({
          success: false,
          error: `Solde insuffisant. Un tour payant coûte $${PAID_SPIN_COST.toFixed(2)}. Votre solde: $${user.balance.toFixed(2)}`,
        }, { status: 400 });
      }
    }

    const { segmentIdx, isWin } = pickSegment();
    const segment = WHEEL_SEGMENTS[segmentIdx];
    const winAmount = segment.reward;
    const betAmount = isFree ? 0 : PAID_SPIN_COST;

    await db.$transaction(async (tx) => {
      // Deduct bet if paid spin
      if (!isFree) {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: PAID_SPIN_COST } },
        });
        await tx.transaction.create({
          data: {
            type: 'game_spin_bet',
            amount: -PAID_SPIN_COST,
            detail: `Tour de roue payant`,
            userId: user.id,
          },
        });
      }

      // Record the spin
      await tx.gameSpin.create({
        data: {
          userId: user.id,
          betAmount,
          winAmount,
          result: isWin ? 'win' : 'loss',
          segmentIdx,
          spinDate: today,
        },
      });

      // Credit winnings if won
      if (isWin && winAmount > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: winAmount } },
        });
        await tx.transaction.create({
          data: {
            type: 'game_spin_win',
            amount: winAmount,
            detail: `Gain roue de la fortune: ${segment.label}`,
            userId: user.id,
          },
        });
      }
    });

    const newSpinsCount = todaySpinsCount + 1;
    const freeSpinsRemaining = Math.max(0, DAILY_FREE_SPINS - newSpinsCount);

    return NextResponse.json({
      success: true,
      segmentIdx,
      segment: { label: segment.label, reward: segment.reward, color: segment.color, isWin },
      isWin,
      winAmount,
      betAmount,
      isFreeSpin: isFree,
      newBalance: user.balance - (isFree ? 0 : PAID_SPIN_COST) + winAmount,
      freeSpinsRemaining,
      message: isWin
        ? `🎉 Gagné ! $${winAmount.toFixed(2)} crédités !`
        : `Perdu ! Essayez encore.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
