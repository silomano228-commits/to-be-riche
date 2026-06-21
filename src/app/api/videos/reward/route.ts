import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getDailyVideos, DAILY_VIDEO_LIMIT } from '@/lib/videos';

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

    // Must have watched at least 50% of the video (no seeking/scrolling allowed)
    if (typeof watchedPercent !== 'number' || watchedPercent < 50) {
      return NextResponse.json({
        success: false,
        error: `Vous devez regarder au moins 50% de la vidéo pour recevoir la récompense. Regardé: ${watchedPercent || 0}%`,
      }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // 3-day rule: after 3 days of watching, a deposit is mandatory
    if (user.videoDepositRequired) {
      return NextResponse.json({
        success: false,
        depositRequired: true,
        error: 'Vous devez effectuer un dépôt sur votre compte vidéo pour continuer à regarder des vidéos.',
      }, { status: 400 });
    }

    const watchedTodayCount = await db.videoWatch.count({
      where: { userId: user.id, watchDate: today },
    });

    if (watchedTodayCount >= DAILY_VIDEO_LIMIT) {
      return NextResponse.json({
        success: false,
        error: `Vous avez déjà regardé les ${DAILY_VIDEO_LIMIT} vidéos d'aujourd'hui. Revenez demain !`,
      }, { status: 400 });
    }

    const dailyVideos = getDailyVideos();
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

    const reward = videoData.reward;
    const now = new Date();

    // Calculate days watching for 3-day rule
    let daysWatching = 0;
    if (user.videoFirstWatchAt) {
      const diffMs = now.getTime() - new Date(user.videoFirstWatchAt).getTime();
      daysWatching = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    }

    // After 3 days of watching, require a deposit before continuing
    const shouldRequireDeposit = daysWatching >= 3;

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
      if (!user.videoFirstWatchAt) {
        updateData.videoFirstWatchAt = now;
      }
      if (shouldRequireDeposit && !user.videoDepositRequired) {
        updateData.videoDepositRequired = true;
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
      depositRequired: shouldRequireDeposit,
      message: `Récompense de $${reward.toFixed(2)} créditée sur votre compte vidéo ! ${newRemaining} vidéo(s) restante(s) aujourd'hui.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
