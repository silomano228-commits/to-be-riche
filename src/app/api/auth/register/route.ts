import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, email, password, password2 } = await request.json();

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

    const user = await db.user.create({
      data: { email, name, password, role: 'user' },
    });

    const { password: _, ...safeUser } = user;
    const cookieStore = await cookies();
    cookieStore.set('br_token', user.id, { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, sameSite: 'lax' });

    return NextResponse.json({
      success: true,
      user: { ...safeUser, transactions: [], project: null },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
