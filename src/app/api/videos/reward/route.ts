import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getDailyVideos, DAILY_VIDEO_LIMIT, getVideoReward, computeDayNumber, type VideoItem } from '@/lib/videos';

// Build the current video list: admin links take priority over the catalog.
async function getCurrentVideos(): Promise<VideoItem[]> {
  const adminLinks = await db.adminVideoLink.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (adminLinks.length > 0) {
    return adminLinks.map((l) => ({
      id: l.youtubeId,
      title: l.title,
      category: (['chinois', 'japonais', 'indien'].includes(l.category) ? l.category : 'entreprise') as VideoItem['category'],
      sponsor: l.sponsor,
      durationMin: l.durationMin,
      reward: l.reward,
    }));
  }
  return getDailyVideos();
}

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

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, watchedPercent } = body;

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'ID vidéo requis' }, { status: 400 });
    }

    // Must have watched at least 30% of the video (lowered for longer videos)
    if (typeof watchedPercent !== 'number' || watchedPercent < 30) {
      return NextResponse.json({
        success: false,
        error: `Vous devez regarder au moins 30% de la vidéo pour recevoir la récompense. Regardé: ${watchedPercent || 0}%`,
      }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // NOTE: The 3-day cycle rule is computed and persisted in
    // /api/videos/list. The videoDepositRequired flag now BLOCKS
    // WITHDRAWALS (see /api/videos/withdraw) — it does NOT block watching.
    // Users may keep watching videos every day; they just can't withdraw the
    // video balance until they clear the current cycle (Level 1 investment +
    // required referrals).

    const watchedTodayCount = await db.videoWatch.count({
      where: { userId: user.id, watchDate: today },
    });

    if (watchedTodayCount >= DAILY_VIDEO_LIMIT) {
      return NextResponse.json({
        success: false,
        error: `Vous avez déjà regardé les ${DAILY_VIDEO_LIMIT} vidéos d'aujourd'hui. Revenez demain !`,
      }, { status: 400 });
    }

    const dailyVideos = await getCurrentVideos();
    const videoData = dailyVideos.find((v) => v.id === videoId);
    if (!videoData) {
      return NextResponse.json({ success: false, error: 'Vidéo non disponible aujourd\'hui' }, { status: 400 });
    }

    const existing = await db.videoWatch.findFirst({
      where: { userId: user.id, videoId, watchDate: today },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Vidéo déjà regardée aujourd\'hui' }, { status: 400 });
    }

    // Compute the day number for this user's video reward cycle.
    // - If videoFirstWatchAt is null → day 1 (first ever watch).
    // - Otherwise → floor((now - videoFirstWatchAt) / 1d) + 1.
    // The reward is then derived deterministically from (userId, dayNumber,
    // videoIndex) so the same user always gets the same reward for the same
    // video on the same day. Day 1 totals $1.60-$1.80 across 5 videos; day 2+
    // totals $0.60-$0.95. See src/lib/videos.ts for the full distribution.
    const now = new Date();
    const dayNumber = computeDayNumber(user.videoFirstWatchAt, now);
    const videoIndex = dailyVideos.findIndex((v) => v.id === videoId);
    const reward = getVideoReward(user.id, videoIndex >= 0 ? videoIndex : 0, dayNumber);

    await db.$transaction(async (tx) => {
      await tx.videoWatch.create({
        data: {
          userId: user.id,
          videoId,
          title: videoData.title,
          reward,
          watchDate: today,
        },
      });
      const updateData: Record<string, unknown> = {
        videoBalance: { increment: reward },
        videoTotalEarned: { increment: reward },
        videoWatchedCount: { increment: 1 },
        videoLastWatchAt: now,
        videoWatchedDate: today,
      };
      // Set first-watch timestamp only once.
      if (!user.videoFirstWatchAt) {
        updateData.videoFirstWatchAt = now;
      }
      await tx.user.update({
        where: { id: user.id },
        data: updateData,
      });
      await tx.transaction.create({
        data: {
          type: 'video_reward',
          amount: reward,
          detail: `Récompense vidéo: ${videoData.title} (${videoData.sponsor})`,
          userId: user.id,
        },
      });
    });

    const newWatchedCount = watchedTodayCount + 1;
    const newRemaining = Math.max(0, DAILY_VIDEO_LIMIT - newWatchedCount);

    return NextResponse.json({
      success: true,
      reward,
      newVideoBalance: user.videoBalance + reward,
      watchedCount: newWatchedCount,
      remaining: newRemaining,
      message: `Récompense de $${reward.toFixed(2)} créditée sur votre compte vidéo ! ${newRemaining} vidéo(s) restante(s) aujourd'hui.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
