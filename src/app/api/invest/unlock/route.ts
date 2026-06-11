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
  2: { requiredReferrals: 2, unlockFee: 0, label: 'Standard', category: 'petit' },
  3: { requiredReferrals: 10, unlockFee: 0, label: 'Premium', category: 'gros' },
  4: { requiredReferrals: 15, unlockFee: 0, label: 'Elite', category: 'gros' },
};

export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    const { level } = await request.json();
    if (!level || !LEVEL_CONFIG[level]) {
      return NextResponse.json({ success: false, error: 'Niveau invalide' });
    }

    const config = LEVEL_CONFIG[level];

    // Must unlock levels sequentially (can't skip)
    if (level > user.unlockedLevel + 1) {
      return NextResponse.json({
        success: false,
        error: `Débloquez d'abord le Niveau ${user.unlockedLevel + 1} avant le Niveau ${level}.`,
      });
    }

    // Already unlocked?
    if (level <= user.unlockedLevel) {
      return NextResponse.json({ success: false, error: `Le Niveau ${level} est déjà débloqué.` });
    }

    // Must have invested in previous level
    const prevLevelInvestment = await db.investment.findFirst({
      where: { userId: user.id, level: level - 1 },
    });
    if (!prevLevelInvestment) {
      return NextResponse.json({
        success: false,
        error: `Vous devez d'abord investir au Niveau ${level - 1} avant de débloquer le Niveau ${level}.`,
        needPreviousLevel: true,
      });
    }

    // Check if user has enough referrals — ONLY referral unlock, no payment option
    if (user.referralCount >= config.requiredReferrals) {
      // Free unlock via referrals
      await db.user.update({
        where: { id: user.id },
        data: { unlockedLevel: level },
      });

      await db.transaction.create({
        data: {
          type: 'level_unlock',
          amount: 0,
          detail: `Niveau ${level} (${config.label}) débloqué grâce à ${user.referralCount} parrainés`,
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
        message: `Niveau ${level} (${config.label}) débloqué ! Vos ${user.referralCount} parrainés vous donnent accès gratuitement.`,
        unlockedBy: 'referrals',
      });
    }

    // Not enough referrals — no payment option available
    const missingReferrals = config.requiredReferrals - user.referralCount;
    return NextResponse.json({
      success: false,
      error: `Parrainés insuffisants. Vous avez ${user.referralCount} parrainé${user.referralCount > 1 ? 's' : ''} mais il vous en faut ${config.requiredReferrals}. Il vous manque ${missingReferrals} parrainé${missingReferrals > 1 ? 's' : ''}.`,
      missingReferrals,
      requiredReferrals: config.requiredReferrals,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
