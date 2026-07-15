import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getDailyVideos, DAILY_VIDEO_LIMIT, getVideoReward, computeDayNumber, getDailyVideoTotal, type VideoItem } from '@/lib/videos';

export const dynamic = 'force-dynamic';

async function computeVideoCycle(user: NonNullable<Awaited<ReturnType<typeof getAuthToken>>>) {
  let daysWatching = 0;
  if (user.videoFirstWatchAt) {
    const diffMs = Date.now() - new Date(user.videoFirstWatchAt).getTime();
    daysWatching = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (daysWatching < 1) daysWatching = 1;
  }

  const currentCycle = Math.max(0, Math.floor((daysWatching - 1) / 3));

  const level1Investment = await db.investment.findFirst({
    where: { userId: user.id, level: 1, status: 'active' },
    select: { id: true },
  });
  const hasLevel1Investment = !!level1Investment;

  const requiredReferrals = currentCycle;

  let videoDepositRequired = user.videoDepositRequired;
  if (currentCycle > user.videoCycleNumber) {
    if (hasLevel1Investment && user.referralCount >= requiredReferrals) {
      await db.user.update({
        where: { id: user.id },
        data: {
          videoCycleNumber: currentCycle,
          videoCycleClearedAt: new Date(),
          videoDepositRequired: false,
        },
      });
      videoDepositRequired = false;
    } else {
      if (!videoDepositRequired) {
        await db.user.update({
          where: { id: user.id },
          data: { videoDepositRequired: true },
        });
      }
      videoDepositRequired = true;
    }
  }

  return {
    daysWatching,
    currentCycle,
    requiredReferrals,
    hasLevel1Investment,
    videoDepositRequired,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    const adminLinks = await db.adminVideoLink.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    const dailyCatalog = getDailyVideos();

    const adminVideos: VideoItem[] = adminLinks.map((l) => ({
      id: l.youtubeId,
      title: l.title,
      category: (['chinois', 'japonais', 'indien'].includes(l.category) ? l.category : 'entreprise') as VideoItem['category'],
      sponsor: l.sponsor,
      durationMin: l.durationMin,
      reward: l.reward,
    }));

    let dailyVideos: VideoItem[];
    let source: 'admin' | 'catalog' | 'mixed';
    if (adminVideos.length > 0) {
      const topAdmin = adminVideos.slice(0, 3);
      const seenIds = new Set(topAdmin.map((v) => v.id));
      const fillers = dailyCatalog.filter((v) => !seenIds.has(v.id));
      dailyVideos = [...topAdmin, ...fillers].slice(0, DAILY_VIDEO_LIMIT);
      source = 'mixed';
    } else {
      dailyVideos = dailyCatalog;
      source = 'catalog';
    }

    const watched = await db.videoWatch.findMany({
      where: { userId: user.id, watchDate: today },
      select: { videoId: true, reward: true, watchedAt: true },
    });

    const watchedMap = new Map(watched.map((w) => [w.videoId, w]));

    const dayNumber = computeDayNumber(user.videoFirstWatchAt);
    const potentialTotalToday = getDailyVideoTotal(user.id, dayNumber);

    const videosWithStatus = dailyVideos.map((v, idx) => {
      const computedReward = getVideoReward(user.id, idx, dayNumber);
      const watchedRow = watchedMap.get(v.id);
      const displayReward = watchedRow ? watchedRow.reward : computedReward;
      return {
        ...v,
        reward: displayReward,
        watched: !!watchedRow,
        watchedAt: watchedRow?.watchedAt || null,
      };
    });

    const watchedCount = watched.length;
    const remaining = Math.max(0, DAILY_VIDEO_LIMIT - watchedCount);
    const totalEarnedToday = watched.reduce((sum, w) => sum + w.reward, 0);

    const cycleState = await computeVideoCycle(user);

    return NextResponse.json({
      success: true,
      videos: videosWithStatus,
      watchedCount,
      remaining,
      dailyLimit: DAILY_VIDEO_LIMIT,
      totalEarnedToday,
      potentialTotalToday,
      dayNumber,
      videoBalance: user.videoBalance,
      videoDepositRequired: cycleState.videoDepositRequired,
      daysWatching: cycleState.daysWatching,
      currentCycle: cycleState.currentCycle,
      videoCycleNumber: user.videoCycleNumber,
      requiredReferrals: cycleState.requiredReferrals,
      hasLevel1Investment: cycleState.hasLevel1Investment,
      referralCount: user.referralCount,
      source,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}