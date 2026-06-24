import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getDailyVideos, DAILY_VIDEO_LIMIT, getVideoReward, computeDayNumber, getDailyVideoTotal, type VideoItem } from '@/lib/videos';

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

// 3-day cycle: every 3 days of watching, the user must clear a new cycle to
// continue withdrawing from the video account. Cycle 0 = days 1-3, cycle 1 =
// days 4-6, cycle 2 = days 7-9, etc. Clearing cycle N requires:
//   - at least one ACTIVE investment at Level 1
//   - referralCount >= N (cycle 1 needs 1 referral, cycle 2 needs 2, etc.)
// When both conditions are met, we auto-clear the cycle on this GET call and
// set videoDepositRequired = false. Otherwise, videoDepositRequired = true and
// the frontend disables the withdraw button.
async function computeVideoCycle(
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>
) {
  // daysWatching: number of distinct days since first watch (+1)
  let daysWatching = 0;
  if (user.videoFirstWatchAt) {
    const diffMs = Date.now() - new Date(user.videoFirstWatchAt).getTime();
    daysWatching = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (daysWatching < 1) daysWatching = 1;
  }

  // currentCycle = floor((daysWatching - 1) / 3). Cycle 0 = days 1-3.
  const currentCycle = Math.max(0, Math.floor((daysWatching - 1) / 3));

  // Check if user has an active investment at Level 1
  const level1Investment = await db.investment.findFirst({
    where: { userId: user.id, level: 1, status: 'active' },
    select: { id: true },
  });
  const hasLevel1Investment = !!level1Investment;

  // Number of referrals needed to clear the CURRENT cycle.
  // Cycle 0 (days 1-3) needs 0 referrals, cycle 1 (days 4-6) needs 1, etc.
  const requiredReferrals = currentCycle;

  // If a new cycle has begun beyond the one the user already cleared, the
  // user must clear it. They can clear it if they have a Level 1 investment
  // AND enough referrals.
  let videoDepositRequired = user.videoDepositRequired;
  if (currentCycle > user.videoCycleNumber) {
    // A new cycle has begun. Can the user clear it automatically?
    if (hasLevel1Investment && user.referralCount >= requiredReferrals) {
      // Auto-clear the new cycle
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
      // User must clear it manually (deposit at Level 1 + invite referrals)
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
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Admin-managed links take priority, but we ALWAYS show 5 videos on the page.
    // If the admin has added fewer than 5 active links, we supplement with the
    // built-in daily catalog (deduped by YouTube ID) so the user always sees 5.
    const adminLinks = await db.adminVideoLink.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

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
    if (adminVideos.length >= DAILY_VIDEO_LIMIT) {
      // Admin has 5+ links — show the 5 most recent.
      dailyVideos = adminVideos.slice(0, DAILY_VIDEO_LIMIT);
      source = 'admin';
    } else if (adminVideos.length > 0) {
      // Admin has 1-4 links — supplement with catalog (deduped) to reach 5.
      const catalogVideos = getDailyVideos();
      const seenIds = new Set(adminVideos.map((v) => v.id));
      const fillers = catalogVideos.filter((v) => !seenIds.has(v.id));
      dailyVideos = [...adminVideos, ...fillers].slice(0, DAILY_VIDEO_LIMIT);
      source = 'mixed';
    } else {
      // No admin links — use the daily catalog (rotates each day).
      dailyVideos = getDailyVideos();
      source = 'catalog';
    }

    const watched = await db.videoWatch.findMany({
      where: { userId: user.id, watchDate: today },
      select: { videoId: true, reward: true, watchedAt: true },
    });

    const watchedMap = new Map(watched.map((w) => [w.videoId, w]));

    // Compute per-video reward badges for the current user/day. For logged-in
    // users we use the deterministic day-1 / day-2+ distribution from
    // getVideoReward (day 1 totals $1.60-$1.80; day 2+ totals $0.60-$0.95).
    // The catalog `reward` field is only used as a fallback display hint when
    // no user is logged in (e.g. for public/anonymous previews).
    const dayNumber = computeDayNumber(user.videoFirstWatchAt);
    const potentialTotalToday = getDailyVideoTotal(user.id, dayNumber);

    const videosWithStatus = dailyVideos.map((v, idx) => {
      const computedReward = getVideoReward(user.id, idx, dayNumber);
      const watchedRow = watchedMap.get(v.id);
      // If the user already watched this video today, the reward field shows
      // the actual credited amount from the watch record (so the UI badge
      // matches what was actually paid). Otherwise show the computed reward
      // for the current day.
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

    // Compute the 3-day cycle state (auto-clears if conditions are met).
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
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
