import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';

// PATCH /api/missions/campaigns/[id] — Update campaign (admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const campaign = await db.campaign.update({
    where: { id },
    data: body,
  });

  return NextResponse.json({ success: true, campaign });
}

// DELETE /api/missions/campaigns/[id] — Delete campaign (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;

  await db.missionImage.deleteMany({ where: { campaignId: id } });
  await db.campaign.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
