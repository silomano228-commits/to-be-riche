import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('br_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: token } });
    if (!user || !user.hasInvested) {
      return NextResponse.json({ success: false, error: 'Investissez d\'abord' });
    }

    const { name, amount, description } = await request.json();
    if (!name || !amount || !description) {
      return NextResponse.json({ success: false, error: 'Remplissez tous les champs' });
    }

    const project = await db.project.create({
      data: {
        name,
        amount: parseFloat(amount),
        description,
        userId: token,
      },
    });

    return NextResponse.json({ success: true, project_id: project.id });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
