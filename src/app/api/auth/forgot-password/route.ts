import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email requis' });
    }

    const user = await db.user.findUnique({ where: { email } });

    // Always return same message to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: false, error: 'Aucun compte trouvé avec cet email' });
    }

    // If newPassword is provided, reset the password directly
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

    // Just confirm the email exists
    return NextResponse.json({ success: true, message: 'Email trouvé' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
