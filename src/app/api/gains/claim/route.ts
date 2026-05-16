import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// POST — Claim daily gains
export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' });

    if (!user.hasInvested) {
      return NextResponse.json({ success: false, error: 'Vous devez d\'abord investir' });
    }

    // Get user's active projects
    const projects = await db.project.findMany({
      where: { userId: token, status: 'active' },
    });

    if (projects.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun projet actif' });
    }

    // Check if already claimed today
    const today = new Date().toISOString().split('T')[0];
    const alreadyClaimed = await db.dailyGain.findFirst({
      where: { userId: token, date: today },
    });

    if (alreadyClaimed) {
      return NextResponse.json({
        success: false,
        error: 'Vous avez déjà réclamé vos gains aujourd\'hui',
        alreadyClaimed: true,
      });
    }

    // Calculate total gains from all active projects
    let totalGain = 0;
    const gainDetails: { projectId: string; projectName: string; rate: number; amount: number }[] = [];

    for (const project of projects) {
      // Generate a new random daily rate between 7% and 15% for this claim
      const newRate = Math.round((Math.random() * 8 + 7) * 100) / 100; // 7.00 to 15.00
      const gainAmount = Math.round(project.amount * newRate / 100 * 100) / 100;

      // Update project daily rate for display
      await db.project.update({
        where: { id: project.id },
        data: { dailyRate: newRate },
      });

      // Create daily gain record
      await db.dailyGain.create({
        data: {
          userId: token,
          projectId: project.id,
          rate: newRate,
          amount: gainAmount,
          date: today,
        },
      });

      totalGain += gainAmount;
      gainDetails.push({
        projectId: project.id,
        projectName: project.name,
        rate: newRate,
        amount: gainAmount,
      });
    }

    totalGain = Math.round(totalGain * 100) / 100;

    // Credit gains to user's earnings and balance
    await db.user.update({
      where: { id: token },
      data: {
        earnings: { increment: totalGain },
        balance: { increment: totalGain },
        lastClaimAt: new Date(),
      },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        type: 'daily_gain',
        amount: totalGain,
        gain: totalGain,
        userId: token,
        projectId: projects[0].id,
      },
    });

    return NextResponse.json({
      success: true,
      totalGain,
      gainDetails,
      message: `Gains réclamés : +${totalGain.toFixed(2)} $`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
