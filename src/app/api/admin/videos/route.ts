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

// Extract a YouTube video ID from a full URL or a raw ID.
// Supports: https://youtu.be/ID, https://www.youtube.com/watch?v=ID,
// https://www.youtube.com/embed/ID, https://www.youtube.com/shorts/ID, or raw ID
function parseYoutubeId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  // Raw ID (11 chars typical, alphanumeric/_/-)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split('/').filter(Boolean);
      // /embed/ID or /shorts/ID
      const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts');
      if (idx >= 0 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) return parts[idx + 1];
    }
  } catch {
    return null;
  }
  return null;
}

// GET — list all admin video links
export async function GET(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const links = await db.adminVideoLink.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST — create a new admin video link
export async function POST(request: Request) {
  try {
    const { error } = await checkAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { youtubeIdOrUrl, title, sponsor, category, durationMin, reward, active } = body;

    const youtubeId = parseYoutubeId(youtubeIdOrUrl);
    if (!youtubeId) {
      return NextResponse.json({
        success: false,
        error: 'Lien YouTube invalide. Collez une URL YouTube ou un ID vidéo (11 caractères).',
      }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Le titre est requis (il doit décrire la vidéo).' }, { status: 400 });
    }

    if (!sponsor || !sponsor.trim()) {
      return NextResponse.json({ success: false, error: 'Le nom de l\'entreprise/sponsor est requis.' }, { status: 400 });
    }

    const validCategories = ['chinois', 'japonais', 'indien', 'entreprise'];
    const finalCategory = validCategories.includes(category) ? category : 'entreprise';

    const link = await db.adminVideoLink.create({
      data: {
        youtubeId,
        title: title.trim(),
        sponsor: sponsor.trim(),
        category: finalCategory,
        durationMin: typeof durationMin === 'number' && durationMin > 0 ? Math.min(durationMin, 30) : 5,
        reward: typeof reward === 'number' && reward > 0 ? Math.min(Math.round(reward * 100) / 100, 1) : 0.20,
        active: active !== false,
      },
    });

    return NextResponse.json({ success: true, data: link, message: 'Vidéo ajoutée. Elle sera visible par tous les utilisateurs.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
