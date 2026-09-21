import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getDailyVideos, DAILY_VIDEO_LIMIT, getVideoReward, computeDayNumber, type VideoItem } from '@/lib/videos';

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

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, watchedPercent } = body;

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'ID vidéo requis' }, { status: 400 });
    }

    if (typeof watchedPercent !== 'number' || watchedPercent < 30) {
      return NextResponse.json({
        success: false,
        error: `Vous devez regarder au moins 30% de la vidéo pour recevoir la récompense. Regardé: ${watchedPercent || 0}%`,
      }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

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

    // Pre-check for fast-fail (authoritative check is inside transaction)
    const existing = await db.videoWatch.findFirst({
      where: { userId: user.id, videoId, watchDate: today },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Vidéo déjà regardée aujourd\'hui' }, { status: 400 });
    }

    const now = new Date();
    const dayNumber = computeDayNumber(user.videoFirstWatchAt, now);
    const videoIndex = dailyVideos.findIndex((v) => v.id === videoId);
    const reward = getVideoReward(user.id, videoIndex >= 0 ? videoIndex : 0, dayNumber);

    await db.$transaction(async (tx) => {
      // Re-check idempotency inside transaction to prevent race condition double-claim
      const txExisting = await tx.videoWatch.findFirst({
        where: { userId: user.id, videoId, watchDate: today },
      });
      if (txExisting) throw new Error('ALREADY_CLAIMED');

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
    if (error instanceof Error && error.message === 'ALREADY_CLAIMED') {
      return NextResponse.json({ success: false, error: 'Vidéo déjà regardée aujourd\'hui' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}