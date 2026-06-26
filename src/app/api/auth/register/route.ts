import { db } from '@/lib/db';
import { notifyUser, notifyAdmin } from '@/lib/notify';
import { tryClaimReferralReward, getRequiredReferrals, needsMoreReferrals } from '@/lib/referral';
import { NextResponse } from 'next/server';
import { generateSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BR-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let exists = await db.user.findUnique({ where: { referralCode: code } });
  let attempts = 0;
  while (exists && attempts < 20) {
    code = generateReferralCode();
    exists = await db.user.findUnique({ where: { referralCode: code } });
    attempts++;
  }
  return code;
}

/**
 * Validate a phone number: 8–15 digits, optional leading '+'.
 * Whitespace is stripped before validation.
 * Returns the normalized phone (with '+' preserved) or null if invalid.
 */
function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.replace(/\s+/g, '').trim();
  if (!trimmed) return null;
  if (!/^\+?\d{8,15}$/.test(trimmed)) return null;
  return trimmed;
}

export async function POST(request: Request) {
  try {
    const { name, email, password, password2, referralCode: inputReferralCode, phone: inputPhone } = await request.json();

    if (!name || name.length < 2) {
      return NextResponse.json({ success: false, error: 'Nom trop court (min. 2 caractères)' });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Mot de passe trop court (min. 6 caractères)' });
    }
    if (password !== password2) {
      return NextResponse.json({ success: false, error: 'Les mots de passe ne correspondent pas' });
    }

    // Anti-fraud (hidden): require a valid phone number.
    const phone = normalizePhone(inputPhone);
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Numéro de téléphone requis' });
    }

    // Anti-fraud (hidden): a phone number may only be used for ONE account.
    const existingPhone = await db.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ success: false, error: 'Impossible de créer le compte' });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email déjà utilisé' });
    }

    // Validate referral code if provided
    let referredByCode: string | null = null;
    if (inputReferralCode && inputReferralCode.trim()) {
      const referrer = await db.user.findUnique({ where: { referralCode: inputReferralCode.trim().toUpperCase() } });
      if (!referrer) {
        return NextResponse.json({ success: false, error: 'Code de parrainage invalide' });
      }
      referredByCode = inputReferralCode.trim().toUpperCase();
    }

    const referralCode = await getUniqueReferralCode();
    const sessionToken = generateSessionToken();

    // Create user with emailVerified = true — NO email verification step.
    // The user is logged in directly after registration.
    const user = await db.user.create({
      data: { email, name, password, role: 'user', referralCode, referredByCode, emailVerified: true, phone, sessionToken },
    });

    // If referred, increment the referrer's referral count
    if (referredByCode) {
      const referrer = await db.user.update({
        where: { referralCode: referredByCode },
        data: { referralCount: { increment: 1 } },
      });
      await notifyUser({
        userId: referrer.id,
        type: 'referral_new',
        title: 'Nouveau parrainé !',
        message: `${name} s'est inscrit avec votre code de parrainage.`,
        link: 'profile',
      });
      await tryClaimReferralReward(referrer);
    }

    // Notify admin about new registration
    await notifyAdmin({
      type: 'new_user',
      title: 'Nouvel utilisateur',
      message: `${name} (${email}) vient de s'inscrire${referredByCode ? ` avec le code ${referredByCode}` : ''}.`,
      userId: user.id,
    });

    // Build the user payload (mirrors /api/auth/login) so the frontend can
    // log the user in directly without any verification step.
    const { password: _, sessionToken: __, ...safeUser } = user;

    const [transactions, investments, activeTradesCount, activeEnterprisesCount, completedWithdrawals] = await Promise.all([
      db.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      db.investment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      db.trade.count({ where: { userId: user.id, resolved: false } }),
      db.enterprise.count({ where: { userId: user.id, status: 'active' } }),
      db.withdrawal.count({ where: { userId: user.id, status: 'approved' } }),
    ]);

    const now = new Date();
    const activeInvestments = investments.filter((i) => i.status === 'active');
    const claimableInvestments = activeInvestments.filter((i) => i.nextClaimAt && now >= i.nextClaimAt);

    const firstDepositDate = user.firstDepositAt;
    const canWithdraw = user.role === 'admin' ? true : firstDepositDate
      ? (now.getTime() - new Date(firstDepositDate).getTime()) >= 48 * 60 * 60 * 1000
      : false;

    const hoursUntilWithdrawal = firstDepositDate && !canWithdraw
      ? Math.ceil(48 - (now.getTime() - new Date(firstDepositDate).getTime()) / (60 * 60 * 1000))
      : 0;

    const response = NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        investBalance: user.investBalance,
        tradeBalance: user.tradeBalance,
        projectBalance: user.projectBalance,
        totalProfit: user.totalProfit,
        totalLoss: user.totalLoss,
        transactions,
        investments,
        activeTradesCount,
        activeEnterprisesCount,
        claimableInvestments: claimableInvestments.length,
        canWithdraw,
        hoursUntilWithdrawal,
        completedWithdrawals,
        requiredReferrals: getRequiredReferrals(completedWithdrawals),
        needsReferral: needsMoreReferrals(completedWithdrawals, user.referralCount),
        unlockedLevel: user.unlockedLevel,
      },
    });

    // Anti-fraud (hidden): set the sessionToken as the br_token cookie.
    response.cookies.set('br_token', sessionToken, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
