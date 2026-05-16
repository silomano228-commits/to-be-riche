import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
  try {
    const { name, email, password, password2, referralCode: inputReferralCode } = await request.json();

    if (!name || name.length < 2) {
      return NextResponse.json({ success: false, error: 'Nom trop court (min. 2 caractères)' });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Mot de passe trop court (min. 6 caractères)' });
    }
    if (password !== password2) {
      return NextResponse.json({ success: false, error: 'Les mots de passe ne correspondent pas' });
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

    const user = await db.user.create({
      data: { email, name, password, role: 'user', referralCode, referredByCode },
    });

    // If referred, increment the referrer's referral count
    if (referredByCode) {
      await db.user.update({
        where: { referralCode: referredByCode },
        data: { referralCount: { increment: 1 } },
      });
    }

    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      user: { ...safeUser, transactions: [], project: null },
    });

    // Set cookie on the response object (reliable method)
    response.cookies.set('br_token', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
