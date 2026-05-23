import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

// Short system prompt for generating quick tips
const TIP_PROMPT = `Tu es l'IA de "Be Rich", une app d'investissement. Génère UN conseil court (1 phrase, max 15 mots) en français pour un investisseur. Varie entre: investissement, trading, projets d'entreprise, parrainage, gestion de portefeuille. Sois encourageant et dynamique. Utilise 1 emoji au début. Réponds SEULEMENT avec le conseil, rien d'autre.`;

// Fallback tips when AI is unavailable
const FALLBACK_TIPS = [
  "📈 Le marché tech est en hausse ! Investissez maintenant.",
  "⚠️ Volatilité détectée. Prudence recommandée.",
  "🔥 L'Elite Investment offre 12.5%/cycle !",
  "📊 Tendance haussière sur 3 jours. Momentum fort.",
  "💡 Diversifiez vos investissements entre les niveaux.",
  "🚀 Nouveau projet entreprise disponible ! +150% possible.",
  "⚡ Le trading rapide peut être lucratif, restez prudent.",
  "📉 Marché en correction. Moment d'acheter bas.",
  "🎯 Les investisseurs élites gagnent 2x plus.",
  "🔄 Réclamez vos gains quotidiens pour maximiser vos profits !",
];

// In-memory cache for ZAI instance
let zaiInstance: any = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function GET(request: Request) {
  try {
    // Support both X-Auth-Token header and cookie
    const authHeader = request.headers.get('x-auth-token');
    let token = authHeader;
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/br_token=([^;]+)/);
      token = match ? match[1] : null;
    }

    // Get user context for personalized tips
    let userContext = '';
    if (token) {
      const user = await db.user.findUnique({ where: { id: token } });
      if (user) {
        userContext = `\nContexte utilisateur: ${user.name}, solde: $${user.balance.toFixed(2)}, invest: $${user.investBalance.toFixed(2)}, profit: $${user.totalProfit.toFixed(2)}, filleuls: ${user.referralCount || 0}.`;
      }
    }

    // Try AI tip
    let tip = '';
    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: TIP_PROMPT + userContext },
          { role: 'user', content: 'Donne-moi un conseil investissement.' },
        ],
        thinking: { type: 'disabled' },
      });
      tip = completion.choices[0]?.message?.content?.trim() || '';
    } catch (aiError) {
      console.error('AI tip error, using fallback:', aiError);
    }

    if (!tip) {
      tip = FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
    }

    return NextResponse.json({ success: true, tip });
  } catch (error) {
    const tip = FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
    return NextResponse.json({ success: true, tip });
  }
}
