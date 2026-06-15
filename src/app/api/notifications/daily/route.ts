import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { getRequiredReferrals } from '@/lib/referral';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Rotating set of motivational messages in French (one per day)
const DAILY_MESSAGES = [
  "Parrainez vos amis et gagnez 20% de bonus sur chaque dépôt ! Plus vous parrainez, plus vous gagnez. 💰",
  "Avec 5% de gains sur vos investissements chaque jour, votre argent travaille pour vous. Investissez maintenant ! 📈",
  "Chaque parrainé vous rapporte 20% de bonus. Partagez votre code et regardez vos revenus grimper ! 🚀",
  "Vos investissements génèrent 5% de gains quotidiens. N'attendez plus, commencez à investir aujourd'hui ! 💎",
  "Le parrainage est la clé ! 20% de bonus sur chaque dépôt de vos parrainés. C'est le moment de partager ! 🔑",
  "Investissez et profitez de 5% de rendement quotidien. Votre avenir financier commence ici ! 🌟",
  "Plus de parrainés, plus de gains ! 20% de commission sur chaque dépôt. Parrainez dès maintenant ! 🎯",
  "Vos gains d'investissement de 5% quotidien vous rapprochent de vos objectifs. Continuez ! 💪",
  "Un seul parrainage peut changer votre situation. 20% de bonus, c'est énorme ! Agissez maintenant ! ⚡",
  "Ne laissez pas votre argent dormir. Investissez et gagnez 5% chaque jour ! 🏦",
  "Votre réseau est votre richesse. 20% de bonus par parrainé, c'est la puissance du parrainage ! 🌍",
  "Les meilleurs investisseurs commencent petit et grandissent. 5% quotidien, c'est votre tremplin ! 🎯",
  "Partagez votre code de parrainage ! Chaque ami qui dépose vous rapporte 20% de bonus. 🎁",
  "L'investissement quotidien à 5% transforme vos dépôts en revenus passifs. Rejoignez les gagnants ! 🏆",
  "Parrainer, c'est partager la réussite. 20% de bonus pour vous, une opportunité pour eux ! 🤝",
];

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });

    // Calculate referral info
    const completedWithdrawals = await db.withdrawal.count({
      where: { userId: user.id, status: 'executed' },
    });
    const requiredReferrals = getRequiredReferrals(completedWithdrawals);
    const currentReferrals = user.referralCount;
    const moreNeeded = Math.max(0, requiredReferrals - currentReferrals);

    // Pick today's message (rotate based on day of year)
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const messageIndex = dayOfYear % DAILY_MESSAGES.length;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    return NextResponse.json({
      success: true,
      data: {
        date: today,
        referralCount: currentReferrals,
        requiredReferrals,
        moreNeededForWithdrawal: moreNeeded,
        message: DAILY_MESSAGES[messageIndex],
        referralCode: user.referralCode,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' });
  }
}
