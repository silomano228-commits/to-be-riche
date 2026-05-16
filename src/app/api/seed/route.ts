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

export async function POST() {
  try {
    const existing = await db.user.findUnique({ where: { email: 'admin@berich.com' } });
    if (existing) return NextResponse.json({ success: true, message: 'Admin already exists' });

    const admin = await db.user.create({
      data: {
        email: 'admin@berich.com',
        name: 'Admin',
        password: 'Admin@2024',
        role: 'admin',
        referralCode: 'BR-ADMIN',
      },
    });

    return NextResponse.json({ success: true, user: admin });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
