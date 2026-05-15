import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const admin = await db.user.findUnique({ where: { id: token } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let totalBalance = 0;
    let totalInvested = 0;
    let activeProjects = 0;

    for (const u of users) {
      totalBalance += u.balance;
      totalInvested += u.invested;
    }

    const projects = await db.project.findMany({ where: { status: 'active' } });
    activeProjects = projects.length;

    const safeUsers = users.map(({ password: _, firstDepositAt: fda, lastClaimAt: lca, ...u }) => u);

    return NextResponse.json({
      success: true,
      users: safeUsers,
      stats: {
        total_users: users.length,
        total_balance: Math.round(totalBalance * 100) / 100,
        total_invested: Math.round(totalInvested * 100) / 100,
        active_projects: activeProjects,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
