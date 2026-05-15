import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET — Check claim status for a specific project + get claim history
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const today = new Date().toISOString().split('T')[0];

    // Check if already claimed today for this project
    let alreadyClaimedToday = false;
    if (projectId) {
      const todayGain = await db.dailyGain.findFirst({
        where: { userId: token, projectId, date: today },
      });
      alreadyClaimedToday = !!todayGain;
    }

    // Get last 5 daily gains for this project
    let history: { rate: number; amount: number; date: string; createdAt: string }[] = [];
    if (projectId) {
      const gains = await db.dailyGain.findMany({
        where: { userId: token, projectId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      history = gains.map((g) => ({
        rate: g.rate,
        amount: g.amount,
        date: g.date,
        createdAt: g.createdAt.toISOString(),
      }));
    }

    return NextResponse.json({
      success: true,
      alreadyClaimedToday,
      history,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
