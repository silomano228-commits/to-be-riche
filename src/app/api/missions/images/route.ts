import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';
import crypto from 'crypto';

// GET /api/missions/images — List user's submitted images
export async function GET(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const campaignId = searchParams.get('campaignId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: any = { userId };
  if (status) where.status = status;
  if (campaignId) where.campaignId = campaignId;

  const images = await db.missionImage.findMany({
    where,
    include: { campaign: { select: { id: true, name: true, brand: true, brief: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await db.missionImage.count({ where });

  return NextResponse.json({ success: true, images, total });
}

// POST /api/missions/images — Submit or generate an image
export async function POST(request: NextRequest) {
  const authUser = await getAuthToken(request);
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = authUser.id;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const body = await request.json();
  const { campaignId, prompt, imageData } = body;

  if (!campaignId) return NextResponse.json({ error: 'campaignId est requis' }, { status: 400 });
  if (!prompt && !imageData) return NextResponse.json({ error: 'prompt ou imageData est requis' }, { status: 400 });

  const config = await ensureSiteConfig();
  const today = new Date().toISOString().split('T')[0];

  // Check campaign exists and is active
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== 'active') {
    return NextResponse.json({ error: 'Campagne non disponible' }, { status: 400 });
  }
  if (campaign.endDate && new Date(campaign.endDate) < new Date()) {
    return NextResponse.json({ error: 'Campagne expirée' }, { status: 400 });
  }

  // Check daily limit
  const dailyCount = await db.missionImage.count({
    where: { userId, campaignId, submittedDate: today },
  });
  if (dailyCount >= campaign.dailyLimit) {
    return NextResponse.json({ error: `Limite quotidienne atteinte (${campaign.dailyLimit} images/jour)` }, { status: 400 });
  }

  // Check campaign max images
  if (campaign.totalImages >= campaign.maxImages) {
    return NextResponse.json({ error: 'Campagne complète' }, { status: 400 });
  }

  let finalImageData = imageData || '';
  let generationPrompt = prompt || '';

  // If prompt provided, generate image with AI
  if (prompt && !imageData) {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const sizeMap: Record<string, string> = {
        '16:9': '1344x768',
        '9:16': '768x1344',
        '4:3': '1152x864',
        '1:1': '1024x1024',
      };
      const size = sizeMap[campaign.format] || '1344x768';
      const fullPrompt = `${prompt}. Style: ${campaign.style}. ${campaign.constraints}`;
      const response = await zai.images.generations.create({ prompt: fullPrompt, size: size as any });
      finalImageData = response.data[0].base64;
    } catch (err: any) {
      return NextResponse.json({ error: 'Erreur de génération IA: ' + (err.message || 'Unknown') }, { status: 500 });
    }
  }

  // Compute perceptual hash (simple hash of first 2000 base64 chars for similarity)
  const hashInput = finalImageData.substring(0, 2000);
  const imageHash = crypto.createHash('sha256').update(hashInput).digest('hex');

  // Create mission image record
  const image = await db.missionImage.create({
    data: {
      userId,
      campaignId,
      imageData: finalImageData,
      imageHash,
      rewardCfa: campaign.rewardCfa,
      submittedDate: today,
      status: 'pending',
    },
  });

  // Update campaign total images
  await db.campaign.update({
    where: { id: campaignId },
    data: { totalImages: { increment: 1 } },
  });

  // Update user last activity
  await db.user.update({
    where: { id: userId },
    data: { lastActivityAt: new Date() },
  });

  // Fire AI validation asynchronously (don't await)
  validateImageAsync(image.id, finalImageData, campaign, imageHash).catch(() => {});

  return NextResponse.json({
    success: true,
    image: {
      id: image.id,
      status: image.status,
      campaignId: image.campaignId,
      submittedDate: image.submittedDate,
      createdAt: image.createdAt,
    },
  });
}

// Async AI validation
async function validateImageAsync(imageId: string, imageData: string, campaign: any, imageHash: string) {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const config = await ensureSiteConfig();

    // Step 1: VLM - Check if image matches brief
    const validationPrompt = `Analysez cette image pour une mission de génération de visuels.
Campagne: ${campaign.name}
Marque: ${campaign.brand}
Brief: ${campaign.brief}
Contraintes: ${campaign.constraints}
Format requis: ${campaign.format}
Style requis: ${campaign.style}

Répondez en JSON avec:
- "matchesBrand": true/false (l'image correspond-elle à la marque ${campaign.brand}?)
- "followsBrief": true/false (l'image respecte-t-elle le brief?)
- "qualityScore": 0-100 (qualité de l'image)
- "complianceScore": 0-100 (conformité globale)
- "reason": explication courte en français`;

    const visionResponse = await zai.chat.completions.createVision({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: validationPrompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageData}` } },
        ],
      }],
      thinking: { type: 'disabled' },
    });

    const analysisText = visionResponse.choices[0]?.message?.content || '';

    // Parse AI response
    let aiScore = 0;
    let matchesBrand = false;
    let followsBrief = false;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiScore = parsed.complianceScore || parsed.qualityScore || 0;
        matchesBrand = parsed.matchesBrand || false;
        followsBrief = parsed.followsBrief || false;
        if (matchesBrand && followsBrief) aiScore = Math.max(aiScore, 70);
      }
    } catch {
      // Fallback: if analysis text contains positive words, give moderate score
      if (analysisText.toLowerCase().includes('correspond') || analysisText.toLowerCase().includes('conforme')) {
        aiScore = 65;
      }
    }

    // Step 2: Check similarity with existing images
    let similarityScore = 0;
    let similarToId: string | null = null;
    const existingImages = await db.missionImage.findMany({
      where: { campaignId: campaign.id, id: { not: imageId }, status: { not: 'duplicate' } },
      select: { id: true, imageHash: true },
      take: 200,
    });

    for (const existing of existingImages) {
      // Simple hash similarity: compare first 40 hex chars
      const hash1 = imageHash.substring(0, 40);
      const hash2 = existing.imageHash.substring(0, 40);
      let matching = 0;
      for (let i = 0; i < Math.min(hash1.length, hash2.length); i++) {
        if (hash1[i] === hash2[i]) matching++;
      }
      const sim = matching / Math.max(hash1.length, hash2.length);
      if (sim > similarityScore) {
        similarityScore = sim;
        similarToId = existing.id;
      }
    }

    // Step 3: Determine final status
    let status = 'pending';
    if (similarityScore > 0.85) {
      status = 'duplicate';
    } else if (aiScore >= 70 && matchesBrand && followsBrief) {
      status = 'validated';
    } else if (aiScore >= 40) {
      status = 'to_correct';
    } else {
      status = 'non_compliant';
    }

    // Update image with validation results
    const updated = await db.missionImage.update({
      where: { id: imageId },
      data: {
        aiScore,
        aiAnalysis: analysisText.substring(0, 2000),
        similarityScore,
        similarToId,
        status,
      },
    });

    // If validated, credit reward
    if (status === 'validated') {
      const rewardCfa = campaign.rewardCfa;
      const rewardUsd = rewardCfa / config.cfaUsdRate;

      await db.user.update({
        where: { id: updated.userId },
        data: {
          missionBalance: { increment: rewardUsd },
          missionTotalEarned: { increment: rewardUsd },
          missionValidatedToday: { increment: 1 },
          missionDate: new Date().toISOString().split('T')[0],
        },
      });

      await db.missionImage.update({
        where: { id: imageId },
        data: { rewardCredited: true },
      });

      // Create transaction record
      await db.transaction.create({
        data: {
          userId: updated.userId,
          type: 'mission_reward',
          amount: rewardUsd,
          detail: `Image validée - Campagne ${campaign.brand} (+${rewardCfa} FCFA)`,
        },
      });

      // Update campaign validated count
      await db.campaign.update({
        where: { id: campaign.id },
        data: { totalValidated: { increment: 1 } },
      });

      // Create notification
      await db.userNotification.create({
        data: {
          userId: updated.userId,
          type: 'mission_reward',
          title: 'Image validée !',
          message: `Votre image a été validée. +${rewardCfa} FCFA ajoutés à votre compte.`,
          link: 'missions',
        },
      });
    } else if (status === 'duplicate') {
      await db.userNotification.create({
        data: {
          userId: updated.userId,
          type: 'mission_refused',
          title: 'Image refusée',
          message: 'Image trop similaire à une image déjà enregistrée.',
          link: 'missions',
        },
      });
    } else if (status === 'non_compliant') {
      await db.userNotification.create({
        data: {
          userId: updated.userId,
          type: 'mission_refused',
          title: 'Image non conforme',
          message: "L'image ne respecte pas le brief de la campagne.",
          link: 'missions',
        },
      });
    }
  } catch (err) {
    // If validation fails, leave image as pending for manual review
    console.error('AI validation error:', err);
  }
}
