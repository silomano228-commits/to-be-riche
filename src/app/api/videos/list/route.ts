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

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyVideos = getDailyVideos();

    // Get videos already watched today by this user
    const watched = await db.videoWatch.findMany({
      where: { userId: user.id, watchDate: today },
      select: { videoId: true, reward: true, watchedAt: true },
    });

    const watchedMap = new Map(watched.map(w => [w.videoId, w]));
    const videosWithStatus = dailyVideos.map(v => ({
      ...v,
      watched: watchedMap.has(v.id),
      watchedAt: watchedMap.get(v.id)?.watchedAt || null,
    }));

    const watchedCount = watched.length;
    const remaining = Math.max(0, DAILY_VIDEO_LIMIT - watchedCount);
    const totalEarnedToday = watched.reduce((sum, w) => sum + w.reward, 0);

    return NextResponse.json({
      success: true,
      videos: videosWithStatus,
      watchedCount,
      remaining,
      dailyLimit: DAILY_VIDEO_LIMIT,
      totalEarnedToday,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
