import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { initiateOtp, verifyOtp, hashOtp } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'send') {
      // Send OTP for password reset
      const { email } = body;
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email requis' });
      }

      const user = await db.user.findUnique({ where: { email } });

      // Always return success to prevent email enumeration
      if (!user) {
        return NextResponse.json({ success: true, message: 'Si un compte existe, un code sera envoyé.' });
      }

      const result = await initiateOtp(email, user.name, 'password_reset', 5);

      return NextResponse.json({
        success: true,
        message: 'Si un compte existe, un code sera envoyé.',
        plain_code: result.plain_code, // only set in simulation mode
      });
    }

    if (action === 'verify') {
      // Verify OTP for password reset
      const { email, code, newPassword } = body;
      if (!email || !code) {
        return NextResponse.json({ success: false, error: 'Email et code requis' });
      }

      const result = await verifyOtp(email, code, 'password_reset');
      if (!result.valid) {
        return NextResponse.json({ success: false, error: result.error || 'Code invalide' });
      }

      // If newPassword is provided, reset the password
      if (newPassword) {
        if (newPassword.length < 6) {
          return NextResponse.json({ success: false, error: 'Le mot de passe doit faire au moins 6 caractères' });
        }
        await db.user.update({
          where: { email },
          data: { password: newPassword },
        });
        return NextResponse.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
      }

      // Otherwise just confirm the OTP is valid (2-step flow)
      return NextResponse.json({ success: true, message: 'Code vérifié' });
    }

    return NextResponse.json({ success: false, error: 'Action invalide' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
