import { db } from '@/lib/db';
import { ensureSiteConfig } from '@/lib/site-config';
import { NextResponse } from 'next/server';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'JÉ-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    // Admin auth check
    const token = request.headers.get('x-auth-token') ||
      (request.headers.get('cookie') || '').match(/br_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: token } });
    if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });

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
          referralCode: 'JÉ-ADMIN',
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
          referredByCode: 'JÉ-ADMIN',
          emailVerified: true,
        },
      });
      await db.user.update({
        where: { referralCode: 'JÉ-ADMIN' },
        data: { referralCount: { increment: 1 } },
      });
      results.push('Test user created');
    } else {
      results.push('Test user already exists');
    }

    // Create SiteConfig with proper defaults
    await ensureSiteConfig();
    results.push('SiteConfig ensured');

    // Seed campaigns if none exist
    const campaignCount = await db.campaign.count();
    if (campaignCount === 0) {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

      const campaigns = await db.campaign.createMany({
        data: [
          {
            name: 'Visuels Immobilier Luxe',
            brand: 'Immobilier Royale',
            description: 'Créez des visuels haut de gamme pour des propriétés immobilières de luxe',
            brief: 'Générez des images de villas, appartements et propriétés de luxe avec des intérieurs modernes, piscines, vues panoramiques. Les images doivent inspirer le luxe et le confort.',
            format: '16:9',
            style: 'realistic',
            constraints: 'Pas de texte sur l\'image. Couleurs chaudes et naturelles. Éclairage professionnel.',
            rewardCfa: 25,
            dailyLimit: 10,
            maxImages: 5000,
            startDate: now,
            endDate: futureDate,
            status: 'active',
            category: 'immobilier',
          },
          {
            name: 'Visuels Automobile Sport',
            brand: 'Mercedes',
            description: 'Créez des visuels dynamiques pour des voitures sportives',
            brief: 'Générez des images de voitures sportives et de luxe dans des décors urbains ou naturels. Les voitures doivent être mises en valeur avec des éclairages dramatiques.',
            format: '16:9',
            style: 'realistic',
            constraints: 'Pas de texte. Fond net et professionnel. Reflets et éclairage réalistes.',
            rewardCfa: 25,
            dailyLimit: 10,
            maxImages: 5000,
            startDate: now,
            endDate: futureDate,
            status: 'active',
            category: 'automobile',
          },
          {
            name: 'Visuels Mode & Beauté',
            brand: 'Louis Vuitton',
            description: 'Créez des visuels élégants pour la mode et la beauté',
            brief: 'Générez des images de mode avec des tenues élégantes, accessoires de luxe (montres, sacs, bijoux). Style magazine de mode haut de gamme.',
            format: '4:3',
            style: 'artistic',
            constraints: 'Pas de texte. Style éditorial magazine. Couleurs cohérentes.',
            rewardCfa: 25,
            dailyLimit: 10,
            maxImages: 5000,
            startDate: now,
            endDate: futureDate,
            status: 'active',
            category: 'mode',
          },
          {
            name: 'Visuels Tech & Innovation',
            brand: 'TechVision',
            description: 'Créez des visuels futuristes pour la technologie',
            brief: 'Générez des images de gadgets, smartphones, laptops, et technologies futuristes. Style minimaliste et épuré avec des rendus 3D réalistes.',
            format: '1:1',
            style: 'realistic',
            constraints: 'Pas de texte. Fond sombre ou neutre. Rendu produit professionnel.',
            rewardCfa: 25,
            dailyLimit: 10,
            maxImages: 5000,
            startDate: now,
            endDate: futureDate,
            status: 'active',
            category: 'tech',
          },
          {
            name: 'Visuels Food & Restaurant',
            brand: 'Saveurs d\'Afrique',
            description: 'Créez des visuels appétissants pour la restauration',
            brief: 'Générez des images de plats gastronomiques, restaurants élégants, buffets. L\'éclairage doit mettre en valeur les couleurs et textures des plats.',
            format: '1:1',
            style: 'realistic',
            constraints: 'Pas de texte. Éclairage chaud. Gros plans sur les plats.',
            rewardCfa: 25,
            dailyLimit: 10,
            maxImages: 5000,
            startDate: now,
            endDate: futureDate,
            status: 'active',
            category: 'food',
          },
          {
            name: 'Visuels Voyage & Tourisme',
            brand: 'Voyages & Rêves',
            description: 'Créez des visuels de destinations de rêve',
            brief: 'Générez des images de plages paradisiaques, montagnes, villes historiques, resorts de luxe. Les images doivent inspirer l\'évasion et le voyage.',
            format: '16:9',
            style: 'realistic',
            constraints: 'Pas de texte. Couleurs vives et naturelles. Ciel dégagé.',
            rewardCfa: 25,
            dailyLimit: 10,
            maxImages: 5000,
            startDate: now,
            endDate: futureDate,
            status: 'active',
            category: 'travel',
          },
        ],
      });
      results.push(`${campaigns.count} campaigns seeded`);
    } else {
      results.push(`Campaigns already exist (${campaignCount})`);
    }

    return NextResponse.json({ success: true, message: results.join(', ') });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
