import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';

// Auto-seed campaigns if none exist
async function ensureCampaigns() {
  const count = await db.campaign.count();
  if (count > 0) return;
  const now = new Date();
  const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  await db.campaign.createMany({
    data: [
      {
        name: 'Visuels Immobilier Luxe',
        brand: 'Immobilier Royale',
        description: 'Créez des visuels haut de gamme pour des propriétés immobilières de luxe',
        brief: 'Générez des images de villas, appartements et propriétés de luxe avec des intérieurs modernes, piscines, vues panoramiques. Les images doivent inspirer le luxe et le confort.',
        format: '16:9',
        style: 'realistic',
        constraints: 'Pas de texte sur l\'image. Couleurs chaudes et naturelles. Éclairage professionnel.',
        rewardCfa: 25,
        dailyLimit: 10,
        maxImages: 5000,
        startDate: now,
        endDate: future,
        status: 'active',
        category: 'immobilier',
      },
      {
        name: 'Visuels Automobile Sport',
        brand: 'Mercedes',
        description: 'Créez des visuels dynamiques pour des voitures sportives',
        brief: 'Générez des images de voitures sportives et de luxe dans des décors urbains ou naturels. Les voitures doivent être mises en valeur avec des éclairages dramatiques.',
        format: '16:9',
        style: 'realistic',
        constraints: 'Pas de texte. Fond net et professionnel. Reflets et éclairage réalistes.',
        rewardCfa: 25,
        dailyLimit: 10,
        maxImages: 5000,
        startDate: now,
        endDate: future,
        status: 'active',
        category: 'automobile',
      },
      {
        name: 'Visuels Mode & Beauté',
        brand: 'Louis Vuitton',
        description: 'Créez des visuels élégants pour la mode et la beauté',
        brief: 'Générez des images de mode avec des tenues élégantes, accessoires de luxe (montres, sacs, bijoux). Style magazine de mode haut de gamme.',
        format: '4:3',
        style: 'artistic',
        constraints: 'Pas de texte. Style éditorial magazine. Couleurs cohérentes.',
        rewardCfa: 25,
        dailyLimit: 10,
        maxImages: 5000,
        startDate: now,
        endDate: future,
        status: 'active',
        category: 'mode',
      },
    ],
  });
}

// GET /api/missions/campaigns — List active campaigns
export async function GET(request: NextRequest) {
  const authUser = await getAuthToken(request);
  const userId = authUser?.id || null;
  const now = new Date();

  // Ensure at least some campaigns exist
  await ensureCampaigns();

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
