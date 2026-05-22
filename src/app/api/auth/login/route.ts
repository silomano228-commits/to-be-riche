import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email et mot de passe requis' });
    }

    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // Auto-seed admin on first login attempt
      if (email === 'admin@berich.com' && password === 'Admin@2024') {
        user = await db.user.create({
          data: { email, name: 'Admin', password, role: 'admin', referralCode: 'BR-ADMIN' },
        });
      } else {
        return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
      }
    }

    if (user.password !== password) {
      return NextResponse.json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Password is correct — require OTP verification before full login
    return NextResponse.json({
      success: true,
      requires_otp: true,
      email: user.email,
      message: 'Vérification OTP requise',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
