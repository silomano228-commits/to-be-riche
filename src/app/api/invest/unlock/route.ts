import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
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

const LEVEL_CONFIG: Record<number, { requiredReferrals: number; unlockFee: number; label: string; category: string }> = {
  // Level 1 is always unlocked by default (unlockedLevel starts at 1).
  // Level 2 requires 12 referrals. Level 3 requires 25 referrals.
  // No payment option — unlock is referral-based only.
  2: { requiredReferrals: 12, unlockFee: 0, label: 'Business', category: 'gros' },
  3: { requiredReferrals: 25, unlockFee: 0, label: 'Elite', category: 'gros' },
};

export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const { level } = await request.json();
    if (!level || !LEVEL_CONFIG[level]) {
      return NextResponse.json({ success: false, error: 'Niveau invalide. Niveaux débloquables: 2 (12 parrainés) ou 3 (25 parrainés).' });
    }

    const config = LEVEL_CONFIG[level];

    // Already unlocked?
    if (level <= user.unlockedLevel) {
      return NextResponse.json({ success: false, error: `Le Niveau ${level} est déjà débloqué.` });
    }

    // Must unlock levels sequentially (can't skip — i.e. need level 2 before 3)
    if (level > user.unlockedLevel + 1) {
      return NextResponse.json({
        success: false,
        error: `Débloquez d'abord le Niveau ${user.unlockedLevel + 1} avant le Niveau ${level}.`,
      });
    }

    // NOTE: No previous-level investment requirement. Unlocking is based on
    // referrals only. The user must have enough referrals to unlock the level.
    if (user.referralCount >= config.requiredReferrals) {
      // Set unlockedLevel to the max of current and the requested level
      const newUnlockedLevel = Math.max(user.unlockedLevel, level);
      await db.user.update({
        where: { id: user.id },
        data: { unlockedLevel: newUnlockedLevel },
      });

      await db.transaction.create({
        data: {
          type: 'level_unlock',
          amount: 0,
          detail: `Niveau ${level} (${config.label}) débloqué grâce à ${user.referralCount} parrainé(s)`,
          userId: user.id,
        },
      });

      await notifyUser({
        userId: user.id,
        type: 'level_unlocked',
        title: `Niveau ${level} débloqué !`,
        message: `Vous avez débloqué le Niveau ${level} (${config.label}) grâce à vos parrainés. Vous pouvez maintenant y investir !`,
        link: 'invest',
      });

      return NextResponse.json({
        success: true,
        message: `Niveau ${level} (${config.label}) débloqué ! Vos ${user.referralCount} parrainé(s) vous donnent accès gratuitement.`,
        unlockedBy: 'referrals',
        unlockedLevel: newUnlockedLevel,
      });
    }

    // Not enough referrals — no payment option available
    const missingReferrals = config.requiredReferrals - user.referralCount;
    return NextResponse.json({
      success: false,
      error: `Parrainés insuffisants. Vous avez ${user.referralCount} parrainé${user.referralCount > 1 ? 's' : ''} mais il vous en faut ${config.requiredReferrals}. Il vous manque ${missingReferrals} parrainé${missingReferrals > 1 ? 's' : ''}.`,
      missingReferrals,
      requiredReferrals: config.requiredReferrals,
      currentReferrals: user.referralCount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
