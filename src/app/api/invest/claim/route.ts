import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

async function getUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  return db.user.findUnique({ where: { id: token } });
}

// Count how many new referrals are needed based on total claims
// Rule: every 5 claims = need 1 more active referral
function getRequiredReferralsForClaims(totalClaims: number, currentReferralCount: number): number {
  const requiredReferrals = Math.floor(totalClaims / 5);
  return Math.max(0, requiredReferrals - currentReferralCount);
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { investmentId, payFee } = body;

    if (!investmentId) {
      return NextResponse.json({ success: false, error: 'Investment ID is required' }, { status: 400 });
    }

    const investment = await db.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment || investment.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Investment not found' }, { status: 404 });
    }

    if (investment.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Investment is not active' }, { status: 400 });
    }

    // Check if user is blocked from claiming (needs more referrals)
    if (user.investClaimBlocked && !payFee) {
      const missingReferrals = getRequiredReferralsForClaims(user.totalInvestClaims, user.referralCount);
      if (missingReferrals > 0) {
        const fee = missingReferrals * 5;
        return NextResponse.json({
          success: false,
          error: `Parrainage requis ! Vous avez fait ${user.totalInvestClaims} collectes. ${missingReferrals} parrainé${missingReferrals > 1 ? 's' : ''} actif${missingReferrals > 1 ? 's' : ''} supplémentaire${missingReferrals > 1 ? 's' : ''} nécessaire${missingReferrals > 1 ? 's' : ''}, ou payez $${fee.toFixed(2)} pour continuer.`,
          needsReferral: true,
          missingReferrals,
          fee,
          referralCode: user.referralCode,
        }, { status: 403 });
      }
    }

    // If user chose to pay the fee instead of getting referrals
    if (user.investClaimBlocked && payFee) {
      const missingReferrals = getRequiredReferralsForClaims(user.totalInvestClaims, user.referralCount);
      const fee = Math.round(missingReferrals * 5 * 100) / 100;
      if (fee > 0) {
        if (user.balance < fee) {
          return NextResponse.json({
            success: false,
            error: `Solde insuffisant. Frais de $${fee.toFixed(2)} requis. Solde: $${user.balance.toFixed(2)}`,
          }, { status: 400 });
        }
        // Deduct fee and unblock
        await db.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              balance: { decrement: fee },
              investClaimBlocked: false,
            },
          });
          await tx.transaction.create({
            data: {
              type: 'invest_claim_fee',
              amount: -fee,
              detail: `Frais de parrainage: $${fee.toFixed(2)} (${missingReferrals} parrainé${missingReferrals > 1 ? 's' : ''} manquant${missingReferrals > 1 ? 's' : ''} × $5)`,
              userId: user.id,
            },
          });
        });
        // Refresh user after payment
        user.balance -= fee;
        user.investClaimBlocked = false;
      }
    }

    const now = new Date();

    // Check 24h cooldown
    if (investment.nextClaimAt && now < investment.nextClaimAt) {
      const remaining = investment.nextClaimAt.getTime() - now.getTime();
      const hoursLeft = Math.ceil(remaining / (60 * 60 * 1000));
      return NextResponse.json({
        success: false,
        error: `Claim not available yet. ${hoursLeft} hour(s) remaining.`,
      }, { status: 400 });
    }

    // Calculate gain (10% of investment amount)
    const gain = Math.round(investment.amount * investment.rate / 100 * 100) / 100;
    const newDoneCycles = investment.doneCycles + 1;
    const newEarned = Math.round((investment.earned + gain) * 100) / 100;
    const newNextClaimAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const newTotalClaims = user.totalInvestClaims + 1;

    // Check if investment is completed after this claim
    const isCompleted = newDoneCycles >= investment.totalCycles;

    // Check if this claim triggers the referral gate (every 5 claims)
    const willBeBlocked = newTotalClaims % 5 === 0;
    const missingAfter = getRequiredReferralsForClaims(newTotalClaims, user.referralCount);

    // On last cycle, also return the principal
    const totalBalanceAdd = isCompleted ? gain + investment.amount : gain;

    await db.$transaction(async (tx) => {
      await tx.investment.update({
        where: { id: investmentId },
        data: {
          doneCycles: newDoneCycles,
          earned: newEarned,
          lastClaimAt: now,
          nextClaimAt: isCompleted ? null : newNextClaimAt,
          status: isCompleted ? 'completed' : 'active',
          finishesAt: isCompleted ? now : investment.finishesAt,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          investBalance: { increment: totalBalanceAdd },
          totalProfit: { increment: gain },
          totalInvestClaims: { increment: 1 },
          investClaimBlocked: !isCompleted && willBeBlocked && missingAfter > 0,
        },
      });
      await tx.transaction.create({
        data: {
          type: isCompleted ? 'invest_completed' : 'invest_claim',
          amount: totalBalanceAdd,
          detail: isCompleted
            ? `Investissement terminé: +$${gain.toFixed(2)} gain + $${investment.amount.toFixed(2)} capital — Cycle ${newDoneCycles}/${investment.totalCycles}`
            : `Investment claim: $${gain.toFixed(2)} gain — Cycle ${newDoneCycles}/${investment.totalCycles}`,
          userId: user.id,
        },
      });

      // 5% of parrainé's investment gains to admin
      if (user.referredByCode) {
        const admin = await tx.user.findFirst({
          where: { role: 'admin' },
        });
        if (admin) {
          const adminBonus = Math.round(gain * 0.05 * 100) / 100;
          if (adminBonus > 0) {
            await tx.user.update({
              where: { id: admin.id },
              data: {
                balance: { increment: adminBonus },
              },
            });
            await tx.transaction.create({
              data: {
                type: 'referral_invest_bonus',
                amount: adminBonus,
                detail: `5% of parrainé's investment gain ($${gain.toFixed(2)})`,
                userId: admin.id,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      gain,
      finalGain: isCompleted ? investment.amount : 0,
      totalCredited: totalBalanceAdd,
      doneCycles: newDoneCycles,
      totalCycles: investment.totalCycles,
      completed: isCompleted,
      blocked: !isCompleted && willBeBlocked && missingAfter > 0,
      missingReferrals: missingAfter,
      fee: missingAfter * 5,
      message: isCompleted
        ? `Investissement terminé ! +$${gain.toFixed(2)} gain + $${investment.amount.toFixed(2)} capital remboursé. Total gagné: $${newEarned.toFixed(2)}`
        : willBeBlocked && missingAfter > 0
          ? `Claimed $${gain.toFixed(2)} gain. Attention: vous avez atteint ${newTotalClaims} collectes. ${missingAfter} parrainé${missingAfter > 1 ? 's' : ''} actif${missingAfter > 1 ? 's' : ''} supplémentaire${missingAfter > 1 ? 's' : ''} requis pour continuer, ou payez $${(missingAfter * 5).toFixed(2)}.`
          : `Claimed $${gain.toFixed(2)} gain. Cycle ${newDoneCycles}/${investment.totalCycles}.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
