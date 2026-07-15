import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LEVEL_CONFIG: Record<number, { requiredReferrals: number; unlockFee: number; label: string; category: string }> = {
  2: { requiredReferrals: 12, unlockFee: 0, label: 'Business', category: 'gros' },
  3: { requiredReferrals: 25, unlockFee: 0, label: 'Elite', category: 'gros' },
};

export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });

    const { level } = await request.json();
    if (!level || !LEVEL_CONFIG[level]) {
      return NextResponse.json({ success: false, error: 'Niveau invalide. Niveaux débloquables: 2 (12 parrainés) ou 3 (25 parrainés).' });
    }

    const config = LEVEL_CONFIG[level];

    if (level <= user.unlockedLevel) {
      return NextResponse.json({ success: false, error: `Le Niveau ${level} est déjà débloqué.` });
    }

    if (level > user.unlockedLevel + 1) {
      return NextResponse.json({
        success: false,
        error: `Débloquez d'abord le Niveau ${user.unlockedLevel + 1} avant le Niveau ${level}.`,
      });
    }

    if (user.referralCount >= config.requiredReferrals) {
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
        message: `Vous avez débloqué le Niveau ${level} (${config.label}) grâce à vos parrainés.`,
        link: 'invest',
      });

      return NextResponse.json({
        success: true,
        message: `Niveau ${level} (${config.label}) débloqué !`,
        unlockedBy: 'referrals',
        unlockedLevel: newUnlockedLevel,
      });
    }

    const missingReferrals = config.requiredReferrals - user.referralCount;
    return NextResponse.json({
      success: false,
      error: `Parrainés insuffisants. Vous avez ${user.referralCount} parrainé${user.referralCount > 1 ? 's' : ''} mais il vous en faut ${config.requiredReferrals}. Il vous manque ${missingReferrals} parrainé${missingReferrals > 1 ? 's' : ''}.`,
      missingReferrals,
      requiredReferrals: config.requiredReferrals,
      currentReferrals: user.referralCount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}