import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUIRED_REFERRALS = 10;

// GET — Returns world link if user has 10+ referrals and admin has set it
export async function GET(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    // Check if user has enough referrals
    if (user.referralCount < REQUIRED_REFERRALS) {
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          message: `Vous avez besoin de ${REQUIRED_REFERRALS} parrainés pour accéder à ce lien. Actuellement : ${user.referralCount}/${REQUIRED_REFERRALS}`,
        },
      });
    }

    // Check if admin has set a worldLink
    const config = await ensureSiteConfig();
    if (!config.worldLink) {
      return NextResponse.json({
        success: true,
        data: {
          eligible: true,
          link: null,
          seen: user.worldLinkSeen,
          message: 'Le lien n\'est pas encore configuré par l\'administrateur.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        eligible: true,
        link: config.worldLink,
        seen: user.worldLinkSeen,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}

// POST — Mark the world link as seen by the user
export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    if (user.referralCount < REQUIRED_REFERRALS) {
      return NextResponse.json({ success: false, error: 'Non éligible' }, { status: 403 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { worldLinkSeen: true },
    });

    return NextResponse.json({ success: true, data: { worldLinkSeen: true } });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
