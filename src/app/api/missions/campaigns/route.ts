import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';

// GET /api/missions/campaigns — List active campaigns
export async function GET(request: NextRequest) {
  const authUser = await getAuthToken(request);
  const userId = authUser?.id || null;
  const now = new Date();

  const campaigns = await db.campaign.findMany({
    where: {
      status: 'active',
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  // If authenticated, include user's daily submission count per campaign
  let userCounts: Record<string, number> = {};
  if (userId) {
    const today = new Date().toISOString().split('T')[0];
    const images = await db.missionImage.groupBy({
      by: ['campaignId'],
      where: { userId, submittedDate: today },
      _count: { id: true },
    });
    images.forEach(img => {
      userCounts[img.campaignId] = img._count.id;
    });
  }

  return NextResponse.json({
    success: true,
    campaigns: campaigns.map(c => ({
      ...c,
      userDailyCount: userCounts[c.id] || 0,
    })),
  });
}

// POST /api/missions/campaigns — Create campaign (admin only)
export async function POST(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await request.json();
  const { name, brand, description, brief, format, style, constraints, rewardCfa, dailyLimit, maxImages, startDate, endDate, category } = body;

  if (!name || !brand || !brief) {
    return NextResponse.json({ error: 'Nom, marque et brief sont requis' }, { status: 400 });
  }

  const config = await ensureSiteConfig();

  const campaign = await db.campaign.create({
    data: {
      name,
      brand,
      description: description || '',
      brief,
      format: format || '16:9',
      style: style || 'realistic',
      constraints: constraints || '',
      rewardCfa: rewardCfa || config.missionRewardCfa,
      dailyLimit: dailyLimit || config.missionDailyLimit,
      maxImages: maxImages || 1000,
      startDate: new Date(startDate || Date.now()),
      endDate: endDate ? new Date(endDate) : null,
      category: category || 'general',
    },
  });

  return NextResponse.json({ success: true, campaign });
}
