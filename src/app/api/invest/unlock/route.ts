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

const LEVEL_CONFIG: Record<number, { requiredReferrals: number; unlockFee: number; label: string }> = {
  2: { requiredReferrals: 2, unlockFee: 5, label: 'Standard' },
  3: { requiredReferrals: 5, unlockFee: 10, label: 'Premium' },
  4: { requiredReferrals: 10, unlockFee: 12, label: 'Elite' },
  5: { requiredReferrals: 20, unlockFee: 15, label: 'VIP' },
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

    // Check if user has enough referrals
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
          detail: `Niveau ${level} (${config.label}) débloqué grâce à ${user.referralCount} filleuls`,
          userId: user.id,
        },
      });

      await notifyUser({
        userId: user.id,
        type: 'level_unlocked',
        title: `Niveau ${level} débloqué !`,
        message: `Vous avez débloqué le Niveau ${level} (${config.label}) grâce à vos filleuls. Vous pouvez maintenant y investir !`,
        link: 'invest',
      });

      return NextResponse.json({
        success: true,
        message: `Niveau ${level} (${config.label}) débloqué ! Vos ${user.referralCount} filleuls vous y donnent accès gratuitement.`,
        unlockedBy: 'referrals',
      });
    }

    // Need to pay for missing referrals
    const missingReferrals = config.requiredReferrals - user.referralCount;
    const fee = Math.round(missingReferrals * config.unlockFee * 100) / 100;

    if (user.balance < fee) {
      return NextResponse.json({
        success: false,
        error: `Solde insuffisant. Vous avez ${missingReferrals} filleul${missingReferrals > 1 ? 's' : ''} manquant${missingReferrals > 1 ? 's' : ''}. Frais de débloquage: $${fee.toFixed(2)}. Solde: $${user.balance.toFixed(2)}`,
        fee,
        missingReferrals,
      });
    }

    // Deduct fee and unlock
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          unlockedLevel: level,
          balance: { decrement: fee },
        },
      });

      await tx.transaction.create({
        data: {
          type: 'level_unlock_fee',
          amount: -fee,
          detail: `Frais de débloquage Niveau ${level} (${config.label}): $${fee.toFixed(2)} (${missingReferrals} filleul${missingReferrals > 1 ? 's' : ''} manquant${missingReferrals > 1 ? 's' : ''} × $${config.unlockFee})`,
          userId: user.id,
        },
      });
    });

    await notifyUser({
      userId: user.id,
      type: 'level_unlocked',
      title: `Niveau ${level} débloqué !`,
      message: `Vous avez débloqué le Niveau ${level} (${config.label}) pour $${fee.toFixed(2)}. Vous pouvez maintenant y investir !`,
      link: 'invest',
    });

    return NextResponse.json({
      success: true,
      message: `Niveau ${level} (${config.label}) débloqué pour $${fee.toFixed(2)} !`,
      unlockedBy: 'payment',
      fee,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
