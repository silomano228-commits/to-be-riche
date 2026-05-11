import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, password, password2 } = await request.json();

    if (!token || !password || !password2) {
      return NextResponse.json({ success: false, error: 'Tous les champs sont requis' });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    if (password !== password2) {
      return NextResponse.json({ success: false, error: 'Les mots de passe ne correspondent pas' });
    }

    // Find the reset token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ success: false, error: 'Token invalide ou expiré' });
    }

    // Check if token is already used
    if (resetToken.used) {
      return NextResponse.json({ success: false, error: 'Ce lien a déjà été utilisé' });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ success: false, error: 'Ce lien a expiré. Veuillez demander un nouveau lien.' });
    }

    // Update the user's password
    await db.user.update({
      where: { id: resetToken.userId },
      data: { password },
    });

    // Mark token as used
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    return NextResponse.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Validate token endpoint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token manquant' });
    }

    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
      return NextResponse.json({ success: false, error: 'Token invalide ou expiré' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Validate token error:', error);
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
