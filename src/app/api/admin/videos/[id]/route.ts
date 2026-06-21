import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

async function checkAdmin(request: Request) {
  const token = getToken(request);
  if (!token) return { error: NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 }), admin: null };
  const admin = await db.user.findUnique({ where: { id: token } });
  if (!admin || admin.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 }), admin: null };
  return { error: null, admin };
}

// PATCH — update an admin video link
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.adminVideoLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vidéo introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.sponsor !== undefined) updateData.sponsor = String(body.sponsor).trim();
    if (body.category !== undefined) {
      const validCategories = ['chinois', 'japonais', 'indien', 'entreprise'];
      updateData.category = validCategories.includes(body.category) ? body.category : 'entreprise';
    }
    if (body.durationMin !== undefined) updateData.durationMin = Math.min(Math.max(1, Number(body.durationMin) || 5), 30);
    if (body.reward !== undefined) updateData.reward = Math.min(Math.round(Number(body.reward) * 100) / 100, 1);
    if (body.active !== undefined) updateData.active = Boolean(body.active);

    const link = await db.adminVideoLink.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE — remove an admin video link
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.adminVideoLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vidéo introuvable' }, { status: 404 });
    }

    await db.adminVideoLink.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Vidéo supprimée' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
