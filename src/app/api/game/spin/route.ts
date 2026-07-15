import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { WHEEL_SEGMENTS, DAILY_SPINS, SPIN_COST } from '../status/route';

export const dynamic = 'force-dynamic';

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

  const profitLimit = totalSpent * 0.7;
  if (gameTotalWon >= profitLimit) {
    return false;
  }

  if (gameTotalWon + 0.20 >= profitLimit) {
    return false;
  }

  const dayIndex = getAccountDayIndex(createdAt);

  const isGoodDay = dayIndex <= 1;
  let baseProbability = isGoodDay
    ? 0.55 + Math.random() * 0.10
    : 0.25 + Math.random() * 0.10;

  const profitRatio = totalSpent > 0 ? gameTotalWon / totalSpent : 0;
  if (profitRatio > 0.5) {
    baseProbability *= 0.3;
  } else if (profitRatio > 0.35) {
    baseProbability *= 0.6;
  } else if (profitRatio > 0.2) {
    baseProbability *= 0.85;
  }

  const targetRate = isGoodDay ? 0.60 : 0.30;
  const expectedWinsSoFar = targetRate * spinsUsedToday;
  if (spinsUsedToday > 0) {
    if (winsSoFarToday < expectedWinsSoFar - 1.0) {
      baseProbability = Math.min(0.80, baseProbability + 0.10);
    } else if (winsSoFarToday > expectedWinsSoFar + 1.0) {
      baseProbability = Math.max(0.10, baseProbability - 0.10);
    }
  }

  return Math.random() < baseProbability;
}

function pickSegment(isWin: boolean, gameTotalWon: number, gameSpinsUsed: number): number {
  if (isWin) {
    const totalSpent = gameSpinsUsed * SPIN_COST;

    const smallWinIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward <= 0.30 ? i : -1))
      .filter((i) => i >= 0);

    const mediumWinIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward > 0.30 && s.reward < 10 ? i : -1))
      .filter((i) => i >= 0);

    const jackpotIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin && s.reward >= 10 ? i : -1))
      .filter((i) => i >= 0);

    const jackpotAllowed = totalSpent > 0 && gameTotalWon < totalSpent * 0.3;
    if (jackpotAllowed && jackpotIndices.length > 0 && Math.random() < 0.01) {
      return jackpotIndices[Math.floor(Math.random() * jackpotIndices.length)];
    }

    if (mediumWinIndices.length > 0 && Math.random() < 0.08) {
      return mediumWinIndices[Math.floor(Math.random() * mediumWinIndices.length)];
    }

    if (smallWinIndices.length > 0) {
      return smallWinIndices[Math.floor(Math.random() * smallWinIndices.length)];
    }

    const anyWinIndices = WHEEL_SEGMENTS
      .map((s, i) => (s.isWin ? i : -1))
      .filter((i) => i >= 0);
    if (anyWinIndices.length > 0) {
      return anyWinIndices[Math.floor(Math.random() * anyWinIndices.length)];
    }
  }

  const losingIndices = WHEEL_SEGMENTS
    .map((s, i) => (!s.isWin ? i : -1))
    .filter((i) => i >= 0);
  return losingIndices[Math.floor(Math.random() * losingIndices.length)];
}

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Re-read user fresh to get latest spin count (prevents race on daily reset)
    const freshUser = await db.user.findUnique({ where: { id: user.id } });
    if (!freshUser) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    let spinsUsed = freshUser.gameSpinsUsed;
    if (freshUser.gameSpinsDate !== today) {
      spinsUsed = 0;
    }

    if (spinsUsed >= DAILY_SPINS) {
      return NextResponse.json({
        success: false,
        dailyLimitReached: true,
        error: 'Limite quotidienne atteinte (10 tours). Revenez demain !',
      }, { status: 400 });
    }

    // Pre-check balance for fast-fail (not authoritative — authoritative check is inside transaction)
    const preBal = Math.max(0, freshUser.balance);
    const preInv = Math.max(0, freshUser.investBalance);
    const preVid = Math.max(0, freshUser.videoBalance);
    const prePrj = Math.max(0, freshUser.projectBalance);
    const totalAvailable = preBal + preInv + preVid + prePrj;

    if (totalAvailable < SPIN_COST) {
      return NextResponse.json({
        success: false,
        insufficientBalance: true,
        error: 'Veuillez effectuer un dépôt sur votre compte Jeu pour continuer à jouer.',
      }, { status: 400 });
    }

    // Mutable result container for transaction output
    const result: { segmentIdx: number; winAmount: number; isWin: boolean; fromBalance: number; fromInvest: number; fromVideo: number; fromProject: number } = {
      segmentIdx: 0, winAmount: 0, isWin: false, fromBalance: 0, fromInvest: 0, fromVideo: 0, fromProject: 0,
    };

    const now = new Date();

    await db.$transaction(async (tx) => {
      // Re-read user inside transaction for authoritative balance (prevents race condition)
      const txUser = await tx.user.findUnique({ where: { id: freshUser.id } });
      if (!txUser) throw new Error('Utilisateur introuvable');

      // Re-check daily limit inside transaction
      let txSpinsUsed = txUser.gameSpinsUsed;
      if (txUser.gameSpinsDate !== today) txSpinsUsed = 0;
      if (txSpinsUsed >= DAILY_SPINS) throw new Error('DAILY_LIMIT');

      // Authoritative balance check inside transaction
      const bal = Math.max(0, txUser.balance);
      const inv = Math.max(0, txUser.investBalance);
      const vid = Math.max(0, txUser.videoBalance);
      const prj = Math.max(0, txUser.projectBalance);

      let remaining = SPIN_COST;
      let fromBalance = 0;
      let fromInvest = 0;
      let fromVideo = 0;
      let fromProject = 0;

      if (remaining > 0 && bal > 0) {
        fromBalance = Math.min(bal, remaining);
        remaining -= fromBalance;
      }
      if (remaining > 0 && inv > 0) {
        fromInvest = Math.min(inv, remaining);
        remaining -= fromInvest;
      }
      if (remaining > 0 && vid > 0) {
        fromVideo = Math.min(vid, remaining);
        remaining -= fromVideo;
      }
      if (remaining > 0 && prj > 0) {
        fromProject = Math.min(prj, remaining);
        remaining -= fromProject;
      }

      if (remaining > 0) throw new Error('INSUFFICIENT_BALANCE');

      // Re-read today's spins inside transaction for accurate win calculation
      const todaySpins = await tx.gameSpin.findMany({
        where: { userId: txUser.id, spinDate: today },
      });
      const winsSoFar = todaySpins.filter((s) => s.result === 'win').length;

      const cumulativeSpinsUsed = txUser.gameSpinsDate === today ? txUser.gameSpinsUsed : 0;
      const isWin = shouldWin(cumulativeSpinsUsed, txUser.gameTotalWon, txUser.createdAt, txSpinsUsed, winsSoFar);
      const segmentIdx = pickSegment(isWin, txUser.gameTotalWon, cumulativeSpinsUsed);
      const segment = WHEEL_SEGMENTS[segmentIdx];
      const winAmount = segment.reward;

      // Store results for response outside transaction
      result.segmentIdx = segmentIdx;
      result.winAmount = winAmount;
      result.isWin = isWin;
      result.fromBalance = fromBalance;
      result.fromInvest = fromInvest;
      result.fromVideo = fromVideo;
      result.fromProject = fromProject;

      await tx.gameSpin.create({
        data: {
          userId: txUser.id,
          betAmount: SPIN_COST,
          winAmount,
          result: isWin ? 'win' : 'loss',
          segmentIdx,
          spinDate: today,
        },
      });

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
        where: { id: txUser.id },
        data: userUpdate,
      });

      const costParts: string[] = [];
      if (fromBalance > 0) costParts.push(`${fromBalance.toFixed(2)} $ du compte Jeu`);
      if (fromInvest > 0) costParts.push(`${fromInvest.toFixed(2)} $ de l'investissement`);
      if (fromVideo > 0) costParts.push(`${fromVideo.toFixed(2)} $ du compte Vidéo`);
      if (fromProject > 0) costParts.push(`${fromProject.toFixed(2)} $ du compte Projet`);
      const costDetail = costParts.length > 1
        ? `Tour de roue (0,20 $) — ${costParts.join(' + ')}`
        : `Tour de roue (0,20 $) — ${costParts[0]}`;

      await tx.transaction.create({
        data: {
          type: 'game_spin_cost',
          amount: -SPIN_COST,
          detail: costDetail,
          userId: txUser.id,
        },
      });

      if (isWin && winAmount > 0) {
        await tx.transaction.create({
          data: {
            type: 'game_win',
            amount: winAmount,
            detail: `Gain roue de la fortune: ${segment.label}`,
            userId: txUser.id,
          },
        });
      }
    });

    const updatedUser = await db.user.findUnique({ where: { id: freshUser.id } });

    const newSpinsUsed = spinsUsed + 1;
    const spinsRemaining = Math.max(0, DAILY_SPINS - newSpinsUsed);
    const netResult = result.winAmount - SPIN_COST;
    const segment = WHEEL_SEGMENTS[result.segmentIdx];

    const message = result.isWin
      ? `Félicitations ! Vous avez gagné $${result.winAmount.toFixed(2)} à la roue ! (Coût du tour: $${SPIN_COST.toFixed(2)} — gain net: $${netResult.toFixed(2)})`
      : `Vous n'avez pas gagné cette fois-ci. Coût du tour: $${SPIN_COST.toFixed(2)}. Réessayez !`;

    return NextResponse.json({
      success: true,
      segmentIdx: result.segmentIdx,
      segment: { label: segment.label, reward: segment.reward, color: segment.color, isWin: result.isWin },
      isWin: result.isWin,
      winAmount: result.winAmount,
      spinCost: SPIN_COST,
      netResult,
      spinsUsed: newSpinsUsed,
      spinsRemaining,
      newBalance: updatedUser?.balance ?? freshUser.balance,
      message,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'DAILY_LIMIT') {
        return NextResponse.json({ success: false, dailyLimitReached: true, error: 'Limite quotidienne atteinte (10 tours). Revenez demain !' }, { status: 400 });
      }
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ success: false, insufficientBalance: true, error: 'Veuillez effectuer un dépôt sur votre compte Jeu pour continuer à jouer.' }, { status: 400 });
      }
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}