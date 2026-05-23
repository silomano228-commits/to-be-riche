import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

const SYSTEM_PROMPT = `Tu es l'assistant IA de l'application "Be Rich", une plateforme d'investissement et de trading. Tu aides les utilisateurs en français.

Ton rôle :
- Expliquer comment fonctionne la plateforme (dépôts, investissements, trading, projets)
- Conseiller sur les stratégies d'investissement (de manière éducative)
- Aider avec les questions sur les comptes (Principal, Investissement, Trading, Projet)
- Expliquer les taux de réussite et les risques
- Répondre aux questions sur les retraits et les parrainages

Informations clés sur Be Rich :
- 4 comptes : Principal (dépôts/retraits), Investissement (gains quotidiens), Trading (mises courtes), Projet (investissements à long terme)
- Investissement : 4 niveaux avec des taux de 5% à 12.5% par cycle (24h)
- Trading : Prédiction HAUT/BAS, durée 1-10 min, gain max +85%, taux de réussite 35%
- Projets : Court/Moyen/Long/Ultra long terme, rendements 40-150%, taux de succès 35%
- Dépôts via TRX (TRON), minimum 10$
- Transfert entre comptes : 2% de frais vers Invest/Trade/Projet, gratuit vers Principal
- Code de parrainage pour inviter des amis

Règles :
- Réponds toujours en français
- Sois amical mais professionnel
- Ne promets jamais de gains garantis
- Rappelle toujours les risques
- Garde les réponses concises (2-3 paragraphes max)

IMPORTANT - TRANSFERT ADMINISTRATEUR :
Si l'utilisateur demande à parler à un administrateur, signale un problème de compte (argent manquant, transaction non reçue, problème technique, conflit, réclamation), ou si tu ne peux pas résoudre son problème, réponds exactement avec ce message spécial sur une ligne seule :
[ESCALATE:raison]
Où "raison" est une brève description du problème en français.
Par exemple : [ESCALATE:Problème de dépôt non reçu]
Ensuite, ajoute une phrase amicale expliquant que tu transfères à un administrateur.`;

let zaiInstance: any = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non connecté' }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message vide' });
    }

    // Check if user has an open ticket — if yes, route to admin mode
    const openTicket = await db.supportTicket.findFirst({
      where: { userId: user.id, status: 'open' },
    });

    if (openTicket) {
      // User is in admin chat mode — save message and notify
      await db.chatMessage.create({
        data: {
          content: message.trim(),
          userId: user.id,
          isAdmin: false,
          isAdminMsg: false,
          ticketId: openTicket.id,
        },
      });

      // Notify admin about new message on existing ticket
      await db.adminNotification.create({
        data: {
          type: 'support_message',
          title: 'Nouveau message support',
          message: `${user.name}: ${message.trim().slice(0, 100)}`,
          ticketId: openTicket.id,
          userId: user.id,
        },
      });

      return NextResponse.json({
        success: true,
        response: 'Votre message a été envoyé à un administrateur. Veuillez patienter pour la réponse.',
        adminMode: true,
      });
    }

    // Save user message to chat history
    await db.chatMessage.create({
      data: { content: message.trim(), userId: user.id, isAdmin: false },
    });

    // Get recent conversation history for context (last 10 messages)
    const recentMessages = await db.chatMessage.findMany({
      where: { userId: user.id, ticketId: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Build conversation for AI
    const conversationMessages = [
      { role: 'assistant' as const, content: SYSTEM_PROMPT },
    ];

    // Add recent messages in chronological order
    const sorted = [...recentMessages].reverse();
    for (const msg of sorted) {
      conversationMessages.push({
        role: msg.isAdmin && !msg.isAdminMsg ? 'assistant' as const : 'user' as const,
        content: msg.content,
      });
    }

    // Get AI response
    let aiResponse: string;
    let shouldEscalate = false;
    let escalateReason = '';

    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: conversationMessages,
        thinking: { type: 'disabled' },
      });
      aiResponse = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse. Veuillez réessayer.';
    } catch (aiError) {
      console.error('AI Error:', aiError);
      aiResponse = 'Désolé, l\'assistant IA est temporairement indisponible. Veuillez réessayer dans quelques instants.';
    }

    // Check if AI wants to escalate
    const escalateMatch = aiResponse.match(/\[ESCALATE:(.+?)\]/);
    if (escalateMatch) {
      shouldEscalate = true;
      escalateReason = escalateMatch[1];
      // Remove the escalation tag from the response
      aiResponse = aiResponse.replace(/\[ESCALATE:.+?\]/, '').trim();
    }

    // Save AI response to chat history
    await db.chatMessage.create({
      data: { content: aiResponse, userId: user.id, isAdmin: true, isAdminMsg: false },
    });

    // If escalation needed, auto-create ticket
    if (shouldEscalate) {
      const ticket = await db.supportTicket.create({
        data: {
          userId: user.id,
          reason: escalateReason,
          status: 'open',
        },
      });

      // Add escalation notice to chat
      await db.chatMessage.create({
        data: {
          content: `🔄 Votre conversation a été transférée à un administrateur. Raison : ${escalateReason}\n\nUn administrateur va vous répondre sous peu. Vos prochains messages lui seront directement adressés.`,
          userId: user.id,
          isAdmin: true,
          isAdminMsg: false,
          ticketId: ticket.id,
        },
      });

      // Create admin notification
      await db.adminNotification.create({
        data: {
          type: 'support_escalation',
          title: 'Demande de support',
          message: `${user.name} (${user.email}) - ${escalateReason}`,
          ticketId: ticket.id,
          userId: user.id,
        },
      });

      return NextResponse.json({
        success: true,
        response: aiResponse + '\n\n🔄 Votre conversation a été transférée à un administrateur. Vos prochains messages lui seront directement adressés.',
        escalated: true,
        ticketId: ticket.id,
      });
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
