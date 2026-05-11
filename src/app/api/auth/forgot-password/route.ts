import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email requis' });
    }

    const user = await db.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    }

    // Invalidate any existing tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Send email via Resend
    try {
      await resend.emails.send({
        from: 'Be Rich <onboarding@resend.dev>',
        to: email,
        subject: 'Réinitialisation de votre mot de passe - Be Rich',
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0F172A, #1E293B); padding: 40px 32px; text-align: center;">
              <h1 style="color: #FBBF24; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0;">BE RICH</h1>
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">Investissement &amp; Finance</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1A2332; font-size: 20px; font-weight: 800; margin: 0 0 12px;">Réinitialisation du mot de passe</h2>
              <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Bonjour <strong style="color: #1A2332;">${user.name}</strong>,<br/>
                Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
              </p>
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to right, #00E676, #00C853); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 20px rgba(0,200,83,0.3);">
                Réinitialiser mon mot de passe
              </a>
              <p style="color: #94A3B8; font-size: 12px; margin-top: 24px; line-height: 1.5;">
                Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
              </p>
              <div style="margin-top: 24px; padding: 16px; background: #FEF3C7; border-radius: 12px; border-left: 3px solid #F59E0B;">
                <p style="color: #92400E; font-size: 12px; margin: 0; line-height: 1.5;">
                  <strong>⚠️ Sécurité :</strong> Ne partagez jamais ce lien avec qui que ce soit. L'équipe Be Rich ne vous demandera jamais votre mot de passe.
                </p>
              </div>
            </div>
            <div style="padding: 20px 32px; background: #F1F5F9; text-align: center;">
              <p style="color: #94A3B8; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Be Rich. Tous droits réservés.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Still return success to not reveal email existence
    }

    return NextResponse.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
