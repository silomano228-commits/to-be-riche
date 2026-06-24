import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { WHEEL_SEGMENTS, DAILY_SPINS, SPIN_COST } from '../status/route';

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

// 5-day cycle win distribution (HIDDEN logic — do NOT surface in UI).
// Over a 5-day rolling cycle derived from the user's account age, 2 "good"
// days yield ~60% win rate (target 6 wins out of 10 spins) and 3 "bad" days
// yield ~35% win rate (target 3-4 wins out of 10 spins). Overall this keeps
// losses in check while still letting the house win on average. We also keep
// a catch-up mechanism: if the user is significantly behind the target win
// count for today, we boost the probability slightly; if they're ahead, we
// trim it. This prevents long losing streaks and also prevents runaway wins.
function shouldWin(spinsUsedToday: number, winsSoFar: number, dayInCycle: number): boolean {
  // Days 0 and 1 are the 2 "good" days in the 5-day cycle (~60% target).
  // Days 2, 3, 4 are the 3 "bad" days (~35% target).
  const isGoodDay = dayInCycle === 0 || dayInCycle === 1;
  let baseProbability = isGoodDay ? 0.60 : 0.35;

  // Catch-up: compare actual wins to the expected wins at this point in the
  // day. Expected wins after N spins = baseProbability * N.
  const expectedWinsSoFar = baseProbability * spinsUsedToday;
  if (winsSoFar < expectedWinsSoFar - 1.0) {
    // User is behind — boost toward target (cap at 0.85 to keep some losses).
    baseProbability = Math.min(0.85, baseProbability + 0.15);
  } else if (winsSoFar > expectedWinsSoFar + 1.0) {
    // User is ahead — trim toward target (floor at 0.15 to keep some wins).
    baseProbability = Math.max(0.15, baseProbability - 0.15);
  }

  return Math.random() < baseProbability;
}

// Pick the wheel segment index for a given outcome. When the user wins, there
// is a 5% chance of landing on the rare $10 grand-prize segment; otherwise we
// pick uniformly from the other win segments. Losses pick uniformly from the
// "Perdu" segments. The $10 probability is independent of the visual segment
// count — it is enforced here at exactly 5% of wins.
function pickSegment(isWin: boolean): number {
  if (isWin) {
    const tenIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward >= 10 ? i : -1))
      .filter((i) => i >= 0);
    if (tenIndices.length > 0 && Math.random() < 0.05) {
      return tenIndices[Math.floor(Math.random() * tenIndices.length)];
    }
    // 95% of wins: pick uniformly from the OTHER win segments (reward < 10).
    const otherWinIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward < 10 ? i : -1))
      .filter((i) => i >= 0);
    if (otherWinIndices.length > 0) {
      return otherWinIndices[Math.floor(Math.random() * otherWinIndices.length)];
    }
    // Fallback (no other win segments — should not happen) — return the $10.
    if (tenIndices.length > 0) return tenIndices[0];
  }
  const losingIndices = WHEEL_SEGMENTS
    .map((s, i) => (!s.isWin ? i : -1))
    .filter((i) => i >= 0);
  return losingIndices[Math.floor(Math.random() * losingIndices.length)];
}

// Compute the day-in-cycle index (0-4) from the user's account age.
// dayInCycle = floor((now - createdAt) / 1d) % 5.
function getDayInCycle(createdAt: Date | string): number {
  const createdMs = new Date(createdAt).getTime();
  const diffDays = Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24));
  return ((diffDays % 5) + 5) % 5;
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
    if (user.gameSpinsDate !== today) {
      spinsUsed = 0;
    }

    // Daily limit: 10 free spins, resets next day
    if (spinsUsed >= DAILY_SPINS) {
      return NextResponse.json({
        success: false,
        dailyLimitReached: true,
        error: 'Limite quotidienne atteinte (10 tours). Revenez demain !',
      }, { status: 400 });
    }

    // ---- Deduct the $0.20 spin cost ----
    // Principal balance is charged first. If it cannot cover the full cost,
    // the remainder is taken from investBalance. If neither account can cover
    // the full $0.20, the spin is rejected with an insuffisant-balance error.
    const balanceAvailable = Math.max(0, user.balance);
    const investAvailable = Math.max(0, user.investBalance);
    if (balanceAvailable + investAvailable < SPIN_COST) {
      return NextResponse.json({
        success: false,
        insufficientBalance: true,
        error: 'Solde insuffisant (minimum 0,20 $)',
      }, { status: 400 });
    }
    const fromBalance = Math.min(balanceAvailable, SPIN_COST);
    const fromInvest = SPIN_COST - fromBalance; // remainder, always ≥ 0

    // Count wins today from gameSpins
    const todaySpins = await db.gameSpin.findMany({
      where: { userId: user.id, spinDate: today },
    });
    const winsSoFar = todaySpins.filter((s) => s.result === 'win').length;

    const dayInCycle = getDayInCycle(user.createdAt);
    const isWin = shouldWin(spinsUsed, winsSoFar, dayInCycle);
    const segmentIdx = pickSegment(isWin);
    const segment = WHEEL_SEGMENTS[segmentIdx];
    const winAmount = segment.reward;
    const now = new Date();

    await db.$transaction(async (tx) => {
      // 1) Record the spin
      await tx.gameSpin.create({
        data: {
          userId: user.id,
          betAmount: SPIN_COST,
          winAmount,
          result: isWin ? 'win' : 'loss',
          segmentIdx,
          spinDate: today,
        },
      });

      // 2) Build the user update with the net effect on each account.
      //    - Principal balance change = winAmount (if won) - fromBalance (cost)
      //    - Invest balance change    = -fromInvest (cost only, never credited)
      //    Both deltas are applied in a single Prisma update so the math is
      //    atomic and consistent.
      const balanceDelta = (isWin ? winAmount : 0) - fromBalance;
      const investDelta = -fromInvest;

      const userUpdate: Record<string, unknown> = {
        gameSpinsUsed: { increment: 1 },
        gameSpinsDate: today,
        gameLastSpinAt: now,
      };
      if (balanceDelta !== 0) userUpdate.balance = { increment: balanceDelta };
      if (investDelta !== 0) userUpdate.investBalance = { increment: investDelta };
      if (isWin && winAmount > 0) {
        userUpdate.gameTotalWon = { increment: winAmount };
      }

      await tx.user.update({
        where: { id: user.id },
        data: userUpdate,
      });

      // 3) Audit transaction for the spin cost (always)
      await tx.transaction.create({
        data: {
          type: 'game_spin_cost',
          amount: -SPIN_COST,
          detail:
            fromInvest > 0
              ? `Tour de roue (0,20 $) — ${fromBalance.toFixed(2)} $ du principal + ${fromInvest.toFixed(2)} $ de l'investissement`
              : `Tour de roue (0,20 $) — débit du compte principal`,
          userId: user.id,
        },
      });

      // 4) Audit transaction for the win (only if won)
      if (isWin && winAmount > 0) {
        await tx.transaction.create({
          data: {
            type: 'game_win',
            amount: winAmount,
            detail: `Gain roue de la fortune: ${segment.label}`,
            userId: user.id,
          },
        });
      }
    });

    // Re-fetch user for accurate balance
    const updatedUser = await db.user.findUnique({ where: { id: user.id } });

    const newSpinsUsed = spinsUsed + 1;
    const spinsRemaining = Math.max(0, DAILY_SPINS - newSpinsUsed);
    const netResult = winAmount - SPIN_COST;

    const message = isWin
      ? `Félicitations ! Vous avez gagné $${winAmount.toFixed(2)} à la roue ! (Coût du tour: $${SPIN_COST.toFixed(2)} — gain net: $${netResult.toFixed(2)})`
      : `Vous n'avez pas gagné cette fois-ci. Coût du tour: $${SPIN_COST.toFixed(2)}. Réessayez !`;

    return NextResponse.json({
      success: true,
      segmentIdx,
      segment: { label: segment.label, reward: segment.reward, color: segment.color, isWin },
      isWin,
      winAmount,
      spinCost: SPIN_COST,
      netResult,
      spinsUsed: newSpinsUsed,
      spinsRemaining,
      newBalance: updatedUser?.balance ?? user.balance,
      message,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
