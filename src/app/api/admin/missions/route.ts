import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';

// GET /api/admin/missions — List all mission images for moderation
export async function GET(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const campaignId = searchParams.get('campaignId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: any = {};
  if (status) where.status = status;
  if (campaignId) where.campaignId = campaignId;

  const images = await db.missionImage.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      campaign: { select: { id: true, name: true, brand: true, brief: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await db.missionImage.count({ where });

  // Stats
  const stats = {
    total: await db.missionImage.count(),
    pending: await db.missionImage.count({ where: { status: 'pending' } }),
    validated: await db.missionImage.count({ where: { status: 'validated' } }),
    refused: await db.missionImage.count({ where: { status: 'non_compliant' } }),
    duplicate: await db.missionImage.count({ where: { status: 'duplicate' } }),
  };

  return NextResponse.json({ success: true, images, total, stats });
}
