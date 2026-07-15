import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// POST — Claim daily gains for a specific project
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'ID projet requis' });
    }

    // Find the project and verify ownership
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== token) {
      return NextResponse.json({ success: false, error: 'Projet non trouvé' });
    }
    if (project.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Projet inactif' });
    }

    // Check if already claimed today for this specific project
    const today = new Date().toISOString().split('T')[0];
    const alreadyClaimed = await db.dailyGain.findFirst({
      where: { userId: token, projectId, date: today },
    });

    if (alreadyClaimed) {
      return NextResponse.json({
        success: false,
        error: 'Gains déjà réclamés pour ce projet aujourd\'hui',
        alreadyClaimed: true,
      });
    }

    // Generate a new random daily rate between 7% and 15%
    const newRate = Math.round((Math.random() * 8 + 7) * 100) / 100; // 7.00 to 15.00
    const gainAmount = Math.round(project.amount * newRate / 100 * 100) / 100;

    // Create daily gain record
    await db.dailyGain.create({
      data: {
        userId: token,
        projectId,
        rate: newRate,
        amount: gainAmount,
        date: today,
      },
    });

    // Update project's daily rate
    await db.project.update({
      where: { id: projectId },
      data: { dailyRate: newRate },
    });

    // Credit the gain to user's earnings and balance
    await db.user.update({
      where: { id: token },
      data: {
        earnings: { increment: gainAmount },
        balance: { increment: gainAmount },
        lastClaimAt: new Date(),
      },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        type: 'daily_gain',
        amount: gainAmount,
        gain: gainAmount,
        userId: token,
        projectId,
      },
    });

    return NextResponse.json({
      success: true,
      gainAmount,
      rate: newRate,
      projectName: project.name,
      message: `+${gainAmount.toFixed(2)} $ réclamés sur ${project.name}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
