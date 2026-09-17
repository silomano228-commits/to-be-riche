import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';

// GET /api/admin/campaigns — List all campaigns (admin)
export async function GET(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { images: true } },
    },
  });

  return NextResponse.json({ success: true, campaigns });
}
