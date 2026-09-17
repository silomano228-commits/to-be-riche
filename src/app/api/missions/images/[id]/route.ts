import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';

// GET /api/missions/images/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id: userId } });

  const image = await db.missionImage.findUnique({
    where: { id },
    include: { campaign: true },
  });

  if (!image) return NextResponse.json({ error: 'Image introuvable' }, { status: 404 });
  // Only owner or admin can view
  if (image.userId !== userId && user?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  return NextResponse.json({ success: true, image });
}

// PATCH /api/missions/images/[id] — Admin review
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, adminNote } = body;

  const image = await db.missionImage.findUnique({ where: { id }, include: { campaign: true } });
  if (!image) return NextResponse.json({ error: 'Image introuvable' }, { status: 404 });

  const updateData: any = { adminReviewed: true };
  if (status) updateData.status = status;
  if (adminNote) updateData.adminNote = adminNote;

  // If admin validates a previously unvalidated image, credit reward
  if (status === 'validated' && !image.rewardCredited) {
    const config = await db.siteConfig.findUnique({ where: { id: 'main' } });
    const cfaUsdRate = config?.cfaUsdRate || 550;
    const rewardCfa = image.rewardCfa || 25;
    const rewardUsd = rewardCfa / cfaUsdRate;

    updateData.rewardCredited = true;

    await db.user.update({
      where: { id: image.userId },
      data: {
        missionBalance: { increment: rewardUsd },
        missionTotalEarned: { increment: rewardUsd },
      },
    });

    await db.transaction.create({
      data: {
        userId: image.userId,
        type: 'mission_reward',
        amount: rewardUsd,
        detail: `Image validée (admin) - Campagne ${image.campaign.brand} (+${rewardCfa} FCFA)`,
      },
    });

    await db.campaign.update({
      where: { id: image.campaignId },
      data: { totalValidated: { increment: 1 } },
    });
  }

  const updated = await db.missionImage.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true, image: updated });
}
