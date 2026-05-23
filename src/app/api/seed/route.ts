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
    const results: string[] = [];

    // Create admin if not exists
    const existingAdmin = await db.user.findUnique({ where: { email: 'silomano228@gmail.com' } });
    if (!existingAdmin) {
      await db.user.create({
        data: {
          email: 'silomano228@gmail.com',
          name: 'Admin',
          password: 'Admin@2024',
          role: 'admin',
          referralCode: 'BR-ADMIN',
          emailVerified: true,
        },
      });
      results.push('Admin created');
    } else {
      results.push('Admin already exists');
    }

    // Create test user if not exists
    const existingTest = await db.user.findUnique({ where: { email: 'test@test.com' } });
    if (!existingTest) {
      const testReferral = generateReferralCode();
      await db.user.create({
        data: {
          email: 'test@test.com',
          name: 'Test User',
          password: 'Test1234',
          role: 'user',
          referralCode: testReferral,
          referredByCode: 'BR-ADMIN',
          emailVerified: true,
        },
      });
      // Increment admin's referral count
      await db.user.update({
        where: { referralCode: 'BR-ADMIN' },
        data: { referralCount: { increment: 1 } },
      });
      results.push('Test user created');
    } else {
      results.push('Test user already exists');
    }

    // Create SiteConfig if not exists
    const existingConfig = await db.siteConfig.findUnique({ where: { id: 'main' } });
    if (!existingConfig) {
      await db.siteConfig.create({
        data: {
          id: 'main',
          adminTrxAddress: '',
          trxUsdPrice: 0.12,
        },
      });
      results.push('SiteConfig created');
    } else {
      results.push('SiteConfig already exists');
    }

    return NextResponse.json({ success: true, message: results.join(', ') });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
