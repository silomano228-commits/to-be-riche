import { db } from '@/lib/db';
import { getAuthToken } from '@/lib/auth';
import { ensureSiteConfig } from '@/lib/site-config';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST — Trigger AI validation for a pending image
export async function POST(request: Request) {
  try {
    const user = await getAuthToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ success: false, error: 'ID image requis' }, { status: 400 });
    }

    // Get image and campaign data
    const image = await db.missionImage.findUnique({
      where: { id: imageId },
      include: { campaign: true },
    });

    if (!image) {
      return NextResponse.json({ success: false, error: 'Image introuvable' }, { status: 404 });
    }

    // Only owner or admin can trigger validation
    if (image.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    if (image.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Image déjà validée (statut: ${image.status})`,
      }, { status: 400 });
    }

    const config = await ensureSiteConfig();

    // Step 1: AI validation via VLM
    let aiScore = 0;
    let aiAnalysis = '';

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const prompt = `Analyze this image for a marketing campaign. Does it match this brief: "${image.campaign.brief}"? Is it high quality? Is the brand "${image.campaign.brand}" clearly visible? Rate compliance from 0 to 100 and explain your rating. Format: SCORE: <number> ANALYSIS: <text>`;

      const response = await zai.chat.completions.createVision({
        model: 'qwen2.5-vl-72b-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${image.imageData}` } },
          ],
        }],
        thinking: { type: 'disabled' },
      });

      const content = response.choices[0]?.message?.content || '';
      aiAnalysis = content;

      // Extract score from response
      const scoreMatch = content.match(/SCORE:\s*(\d+)/i);
      if (scoreMatch) {
        aiScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
      } else {
        const numMatch = content.match(/(\d{1,3})/);
        if (numMatch) {
          aiScore = Math.min(100, Math.max(0, parseInt(numMatch[1], 10)));
        }
      }
    } catch {
      aiScore = 50;
      aiAnalysis = 'Validation IA indisponible - vérification manuelle requise';
    }

    // Step 2: Check similarity against existing images in campaign
    let similarityScore = 0;
    let similarToId: string | null = null;

    try {
      const otherImages = await db.missionImage.findMany({
        where: {
          campaignId: image.campaignId,
          id: { not: image.id },
          status: { in: ['validated', 'pending', 'to_correct'] },
        },
        select: { id: true, imageHash: true },
        take: 50,
      });

      for (const other of otherImages) {
        const hash1 = image.imageHash;
        const hash2 = other.imageHash;
        const len = Math.min(hash1.length, hash2.length);
        let matching = 0;
        for (let i = 0; i < len; i++) {
          if (hash1[i] === hash2[i]) matching++;
        }
        const sim = len > 0 ? matching / len : 0;
        if (sim > similarityScore) {
          similarityScore = sim;
          similarToId = other.id;
        }
      }
    } catch {
      // Similarity check failed, continue
    }

    // Step 3: Determine final status
    let finalStatus: string;
    const isDuplicate = similarityScore > 0.85;

    if (isDuplicate) {
      finalStatus = 'duplicate';
    } else if (aiScore >= 70) {
      finalStatus = 'validated';
    } else if (aiScore >= 40) {
      finalStatus = 'to_correct';
    } else {
      finalStatus = 'non_compliant';
    }

    // Step 4: Update image with validation results
    await db.missionImage.update({
      where: { id: imageId },
      data: {
        aiScore,
        aiAnalysis,
        similarityScore,
        similarToId,
        status: finalStatus,
      },
    });

    // Step 5: If validated, credit reward
    let rewardCredited = false;

    if (finalStatus === 'validated') {
      const rewardCfa = image.campaign.rewardCfa || config.missionRewardCfa;
      const rewardUsd = rewardCfa / config.cfaUsdRate;

      await db.$transaction(async (tx) => {
        await tx.missionImage.update({
          where: { id: imageId },
          data: {
            rewardCfa,
            rewardCredited: true,
          },
        });

        await tx.user.update({
          where: { id: image.userId },
          data: {
            missionBalance: { increment: rewardUsd },
            missionTotalEarned: { increment: rewardUsd },
          },
        });

        await tx.transaction.create({
          data: {
            userId: image.userId,
            type: 'mission_reward',
            amount: rewardUsd,
            detail: `Récompense mission: ${rewardCfa} FCFA (${image.campaign.brand})`,
          },
        });
      });

      rewardCredited = true;
    }

    // Update campaign totalValidated count if validated
    if (finalStatus === 'validated') {
      await db.campaign.update({
        where: { id: image.campaignId },
        data: { totalValidated: { increment: 1 } },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        imageId,
        aiScore,
        aiAnalysis,
        similarityScore,
        similarToId,
        status: finalStatus,
        isDuplicate,
        rewardCredited,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
