import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getDailyVideos, DAILY_VIDEO_LIMIT, type VideoItem } from '@/lib/videos';

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

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Admin-managed links take priority over the default daily catalog.
    // If the administrator has added active video links, those are shown to all users.
    // Otherwise, fall back to the built-in daily catalog (rotates each day).
    const adminLinks = await db.adminVideoLink.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    let dailyVideos: VideoItem[];
    let source: 'admin' | 'catalog';
    if (adminLinks.length > 0) {
      dailyVideos = adminLinks.map((l) => ({
        id: l.youtubeId,
        title: l.title,
        category: (['chinois', 'japonais', 'indien'].includes(l.category) ? l.category : 'entreprise') as VideoItem['category'],
        sponsor: l.sponsor,
        durationMin: l.durationMin,
        reward: l.reward,
      }));
      source = 'admin';
    } else {
      dailyVideos = getDailyVideos();
      source = 'catalog';
    }

    const watched = await db.videoWatch.findMany({
      where: { userId: user.id, watchDate: today },
      select: { videoId: true, reward: true, watchedAt: true },
    });

    const watchedMap = new Map(watched.map((w) => [w.videoId, w]));
    const videosWithStatus = dailyVideos.map((v) => ({
      ...v,
      watched: watchedMap.has(v.id),
      watchedAt: watchedMap.get(v.id)?.watchedAt || null,
    }));

    const watchedCount = watched.length;
    const remaining = Math.max(0, DAILY_VIDEO_LIMIT - watchedCount);
    const totalEarnedToday = watched.reduce((sum, w) => sum + w.reward, 0);

    // Calculate days watching (for 3-day rule)
    let daysWatching = 0;
    if (user.videoFirstWatchAt) {
      const diffMs = Date.now() - new Date(user.videoFirstWatchAt).getTime();
      daysWatching = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    }

    return NextResponse.json({
      success: true,
      videos: videosWithStatus,
      watchedCount,
      remaining,
      dailyLimit: DAILY_VIDEO_LIMIT,
      totalEarnedToday,
      videoBalance: user.videoBalance,
      videoDepositRequired: user.videoDepositRequired,
      daysWatching,
      source,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
