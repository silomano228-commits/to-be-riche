import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { projectId } = await request.json();
    const project = await db.project.findUnique({ where: { id: projectId } });

    if (!project || project.userId !== token) {
      return NextResponse.json({ success: false, error: 'Projet non trouvé' });
    }
    if (project.status === 'completed') {
      return NextResponse.json({ success: false, error: 'Projet déjà terminé' });
    }

    const tranche = Math.min(
      Math.round(project.amount * 0.1 * 100) / 100,
      Math.round((project.amount - project.receivedAmount) * 100) / 100
    );

    if (tranche <= 0) {
      return NextResponse.json({ success: false, error: 'Terminé' });
    }

    const newReceived = Math.round((project.receivedAmount + tranche) * 100) / 100;
    const isCompleted = newReceived >= project.amount;

    await db.project.update({
      where: { id: projectId },
      data: {
        receivedAmount: newReceived,
        status: isCompleted ? 'completed' : 'active',
      },
    });

    await db.user.update({
      where: { id: token },
      data: { balance: { increment: tranche } },
    });

    await db.transaction.create({
      data: {
        type: 'claim',
        amount: tranche,
        userId: token,
        projectId,
      },
    });

    return NextResponse.json({ success: true, amount: tranche });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
