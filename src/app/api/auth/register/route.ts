import { db } from '@/lib/db';
import { notifyUser, notifyAdmin } from '@/lib/notify';
import { tryClaimReferralReward } from '@/lib/referral';
import { NextResponse } from 'next/server';
import { initiateOtp, generateSessionToken } from '@/lib/auth';

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
    // We return a GENERIC error so fraudsters cannot learn that the phone is
    // the blocking reason.
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
    // Anti-fraud (hidden): mint a sessionToken at registration so the account
    // is bound to a single active session. Each subsequent login rotates this
    // token, invalidating previous sessions on other devices.
    const sessionToken = generateSessionToken();

    // Create user with emailVerified = false — must verify email via OTP
    const user = await db.user.create({
      data: { email, name, password, role: 'user', referralCode, referredByCode, emailVerified: false, phone, sessionToken },
    });

    // If referred, increment the referrer's referral count
    if (referredByCode) {
      const referrer = await db.user.update({
        where: { referralCode: referredByCode },
        data: { referralCount: { increment: 1 } },
      });
      // Notify referrer about new parrainé
      await notifyUser({
        userId: referrer.id,
        type: 'referral_new',
        title: 'Nouveau parrainé !',
        message: `${name} s'est inscrit avec votre code de parrainage.`,
        link: 'profile',
      });
      // Surprise $5 gift when the referrer reaches 12 active referrals.
      // This is idempotent (guarded by referralRewardClaimed) so it's safe
      // to call here even if a parallel session-load also triggers it.
      await tryClaimReferralReward(referrer);
    }

    // Notify admin about new registration
    await notifyAdmin({
      type: 'new_user',
      title: 'Nouvel utilisateur',
      message: `${name} (${email}) vient de s'inscrire${referredByCode ? ` avec le code ${referredByCode}` : ''}.`,
      userId: user.id,
    });

    // Send OTP for email verification
    const otpResult = await initiateOtp(email, name, 'email_verification', 10);

    const response = NextResponse.json({
      success: true,
      requires_verification: true,
      email,
      message: 'Vérifiez votre email pour activer votre compte',
      plain_code: otpResult.plain_code, // only set in simulation mode
    });

    // Anti-fraud (hidden): set the sessionToken as the br_token cookie (NOT
    // user.id). maxAge: 7 days, httpOnly: false, sameSite: 'lax', secure: false.
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
