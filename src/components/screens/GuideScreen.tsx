/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ANALYSE FINANCIÈRE — Scénario : 10 utilisateurs, premier mois (30 jours)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * HYPOTHÈSES :
 * ─ 10 utilisateurs initiaux, solde $0
 * ─ 8 déposent $5 (Niveau 1), 2 déposent $65 (Niveau 2)
 * ─ Tous regardent 5 vidéos/jour pendant 30 jours
 * ─ Chaque utilisateur parraine en moyenne 2 personnes → 20 nouveaux utilisateurs au total
 * ─ Niveau 1 : investissement $5–$15, rendement 5 %/jour, collecte immédiate
 * ─ Niveau 2 : investissement $65, rendement 5 %/jour, collecte BLOQUÉE sans 12 parrainages
 * ─ Vidéo : ~$0,20/vidéo × 5 = ~$1/jour/utilisateur (bloqué après 3 jours sans parrainage + dépôt)
 * ─ Jeu de roue : 10 tours/jour × $0,20 = $2/jour, système truqué (~70 % retenu)
 * ─ Taux TRX/USD : affichage uniquement, pas utilisé pour les calculs de rentabilité
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 1. DÉPÔTS REÇUS PAR L'ADMIN
 * ──────────────────────────────────────────────────────────────────────────
 *   8 × $5  (Niveau 1)   =  $40
 *   2 × $65 (Niveau 2)   = $130
 *                          ─────
 *   TOTAL DÉPÔTS          = $170
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 2. PAYOUTS INVESTISSEMENT QUOTIDIENS (5 % des investissements actifs)
 * ──────────────────────────────────────────────────────────────────────────
 *   Niveau 1 : 8 × $5 × 5 % = $2/jour → $2 × 30 = $60/mois
 *   Niveau 2 : 2 × $65 × 5 % = $6,50/jour
 *              → COLLECTE BLOQUÉE (aucun n'atteint 12 parrainages au mois 1)
 *                          ─────
 *   TOTAL PAYOUTS INV.    = $60  (uniquement Niveau 1)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 3. RÉCOMPENSES VIDÉO
 * ──────────────────────────────────────────────────────────────────────────
 *   Jours 1–3 (sans restriction) :
 *     10 utilisateurs × $1/jour × 3 jours = $30
 *
 *   Jours 4–30 (27 jours) :
 *     Condition : ≥ 1 parrainage + dépôt d'investissement actif.
 *     Ensuite, tous les 2 jours, il faut un NOUVEAU parrainage.
 *     Avec ~2 parrainages total par utilisateur sur 30 jours, la plupart
 *     ne maintiennent les conditions que ~4–5 jours supplémentaires.
 *     10 utilisateurs × $1/jour × 5 jours (moyenne) = $50
 *
 *   Si les vidéos n'étaient PAS bloquées : 10 × $1 × 30 = $300
 *                          ─────
 *   TOTAL VIDÉO PAYÉ      = $80
 *   ÉCONOMIE (bloqué)     = $220
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 4. REVENU NET DU JEU DE ROUE
 * ──────────────────────────────────────────────────────────────────────────
 *   Dépense totale utilisateurs : 10 × $2/jour × 30 jours = $600
 *   Système truqué (~70 % retenu) :
 *     Retenu (détruit du système) : $600 × 70 % = $420
 *     Distribué aux joueurs       : $600 × 30 % = $180
 *
 *   Note : les $420 « retenus » ne sont pas un vrai revenu en argent réel.
 *   C'est de l'argent virtuel qui n'est jamais crédité sur les comptes.
 *   L'effet réel est de DÉTRUIRE $420 de balances virtuelles, ce qui
 *   réduit les demandes de retrait potentielles.
 *                          ─────
 *   GAINS JOUEURS (virtuels) = $180
 *   ARGENT DÉTRUIT           = $420
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 5. COMMISSIONS DE PARRAINAGE (5 % des gains quotidiens des filleuls)
 * ──────────────────────────────────────────────────────────────────────────
 *   20 nouveaux utilisateurs, ~50 % investissent au Niveau 1 ($5).
 *   10 filleuls investisseurs × $5 × 5 % = $0,25/jour chacun.
 *   Arrivée progressive : durée moyenne ~15 jours.
 *   10 × $0,25 × 15 jours = $37,50 crédités sur comptes Investissement.
 *                          ─────
 *   TOTAL COMMISSIONS      = ~$37,50
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 6. DEMANDES DE RETRAIT
 * ──────────────────────────────────────────────────────────────────────────
 *   Balances virtuelles totales créées (mois 1) :
 *     Vidéo            : $80
 *     Investissement   : $60 (retours L1)
 *     Jeu (gains roue) : $180
 *     Parrainage       : $37,50
 *                          ─────
 *     TOTAL VIRTUEL    = $357,50
 *
 *   Seuil minimum de retrait : $1 (Vidéo) / $5 (autres comptes).
 *   L'admin contrôle TOUTES les approbations de retrait.
 *   Estimation : ~60 % des demandes approuvées → ~$70–$90 réellement versés.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 7. BÉNÉFICE NET ADMIN — APRÈS 1 MOIS
 * ──────────────────────────────────────────────────────────────────────────
 *   Argent réel reçu (dépôts)            +$170
 *   Argent réel versé (retraits)          -$80
 *                                          ─────
 *   BÉNÉFICE NET RÉEL                     ≈ +$90
 *
 *   Et ce bénéfice augmente chaque mois car :
 *   • Les dépôts Niveau 2 ($130) restent bloqués (pas de 12 parrainages)
 *   • Les nouveaux utilisateurs apportent de nouveaux dépôts
 *   • Le jeu de roue détruit continuellement les balances virtuelles
 *
 * ──────────────────────────────────────────────────────────────────────────
 * 8. POURQUOI LE SYSTÈME EST TOUJOURS RENTABLE
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  a) RÉCOMPENSES VIDÉO BLOQUÉES APRÈS 3 JOURS
 *     Sans parrainage + dépôt d'investissement, les vidéos ne rapportent plus.
 *     La plupart des utilisateurs actifs n'ont pas assez de parrainages
 *     pour maintenir les gains → $220 économisés sur le scénario (73 % de réduction).
 *
 *  b) JEU DE ROUE TRUQUÉ (70 %+ retenu)
 *     L'argent dépensé en tours est majoritairement détruit du système.
 *     Cela réduit les balances virtuelles accumulées et limite les retraits.
 *
 *  c) INVESTISSEMENTS NIVEAU 2 : COLLECTE IMPOSSIBLE SANS 12 PARRAINAGES
 *     Les $130 déposés au Niveau 2 génèrent des gains théoriques de
 *     $6,50/jour, mais AUCUN ne peut être collecté au mois 1.
 *     Cet argent reste dans le système indéfiniment.
 *
 *  d) L'ADMIN CONTRÔLE TOUTES LES APPROBATIONS
 *     Dépôts et retraits nécessitent l'approbation de l'admin.
 *     L'admin peut rejeter, retarder ou limiter toute demande de retrait.
 *
 *  e) TAUX DE CHANGE FIXÉ (550 FCFA = 1 USD)
 *     Le taux est défini par l'admin et ne reflète pas forcément le taux réel.
 *     Cela offre une marge supplémentaire sur les conversions.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';

// =====================================================================
// Be Rich — Guide complet
// 8 sections : Concept, Vidéos, Investissement, Jeu,
// Comptes, Dépôts/Retraits, Parrainage, Navigation.
// =====================================================================

type SectionId =
  | 'concept'
  | 'videos'
  | 'invest'
  | 'game'
  | 'accounts'
  | 'payments'
  | 'referral'
  | 'nav';

interface SectionDef {
  id: SectionId;
  label: string;
  icon: string;
  color: string;
  summary: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'concept',  label: 'Le Concept',                     icon: 'fa-lightbulb',      color: '#14B8A6', summary: 'Be Rich vous paie pour regarder des vidéos, investir et jouer' },
  { id: 'videos',   label: 'La Plateforme Vidéo',            icon: 'fa-video',          color: '#14B8A6', summary: '5 vidéos/jour · 3 jours sans restriction · retrait dès $1 dès le jour 1' },
  { id: 'invest',   label: "L'Investissement (Make Money)",  icon: 'fa-chart-line',     color: '#059669', summary: '3 niveaux · 5%/jour · collecte sur compte investissement' },
  { id: 'game',     label: 'Le Jeu de Roue',                 icon: 'fa-dice',           color: '#F59E0B', summary: '10 tours/jour · 0,20 $/tour · arrêt manuel ou auto à 3 s' },
  { id: 'accounts', label: 'Les Comptes',                    icon: 'fa-wallet',         color: '#22C55E', summary: 'Total (vue) · Jeu · Investissement · Projet · Vidéo' },
  { id: 'payments', label: 'Dépôts et Retraits',             icon: 'fa-credit-card',    color: '#EF4444', summary: 'YAS & TRX · 550 FCFA = 1 USD · retrait depuis tous les comptes' },
  { id: 'referral', label: 'Parrainage',                     icon: 'fa-gift',           color: '#EC4899', summary: '5 % à vie sur les gains de vos filleuls · anti-doublon' },
  { id: 'nav',      label: 'Navigation',                     icon: 'fa-compass',        color: '#64748B', summary: '4 onglets : Vidéos · Make Money · Guide · Profil' },
];

export default function GuideScreen() {
  const { user } = useAppStore();
  const [open, setOpen] = useState<Set<SectionId>>(new Set<SectionId>(['concept']));

  const toggle = (id: SectionId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!user) return null;

  return (
    <>
      <Header title="Guide" icon="fa-compass" iconColor="#14B8A6" />
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#F8FBFA] to-[#F0FDFA]">
        {/* ---------- Hero ---------- */}
        <div className="px-4 pt-4 pb-3">
          <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)' }}>
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/10" />
            <div className="relative flex items-start gap-3">
              <LogoImg className="w-14 h-14 rounded-2xl bg-white/20 p-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-[1.2rem] font-black text-white leading-tight">Guide Be Rich</h1>
                <p className="text-[0.72rem] text-white/85 mt-1 leading-relaxed">
                  Tout ce qu&apos;il faut savoir pour gagner de l&apos;argent :
                  vidéos, investissements, jeu de roue et parrainage.
                </p>
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              <Pill icon="fa-video" text="Vidéos" />
              <Pill icon="fa-chart-line" text="Investir" />
              <Pill icon="fa-dice" text="Jeu" />
              <Pill icon="fa-share-nodes" text="Parrainage" />
            </div>
          </div>
        </div>

        {/* ---------- Quick help ---------- */}
        <div className="px-4 pb-2">
          <div className="rounded-2xl bg-white p-3.5 border border-[#E5E7EB] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] flex items-center justify-center shrink-0">
              <i className="fas fa-lightbulb text-[#0F766E] text-[0.85rem]" />
            </div>
            <p className="text-[0.72rem] text-[#4B5563] leading-snug">
              Touchez une section pour la déplier. Trouvez vite la réponse à votre question.
            </p>
          </div>
        </div>

        {/* ---------- Accordion ---------- */}
        <div className="px-4 pb-8 pt-2 space-y-2.5">
          {SECTIONS.map((s) => {
            const isOpen = open.has(s.id);
            return (
              <div key={s.id} className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left cursor-pointer transition-colors hover:bg-[#F9FAFB] active:bg-[#F3F4F6]"
                  aria-expanded={isOpen}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}1A` }}>
                    <i className={`fas ${s.icon} text-[0.95rem]}`} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.86rem] font-black text-[#1F2937] truncate">{s.label}</div>
                    <div className="text-[0.66rem] text-[#6B7280] truncate">{s.summary}</div>
                  </div>
                  <i className={`fas fa-chevron-down text-[0.7rem] text-[#9CA3AF] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 border-t border-[#F3F4F6]">
                      {s.id === 'concept'  && <ConceptContent />}
                      {s.id === 'videos'   && <VideosContent />}
                      {s.id === 'invest'   && <InvestContent />}
                      {s.id === 'game'     && <GameContent />}
                      {s.id === 'accounts' && <AccountsContent />}
                      {s.id === 'payments' && <PaymentsContent />}
                      {s.id === 'referral' && <ReferralContent />}
                      {s.id === 'nav'      && <NavContent />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- Footer note ---------- */}
        <div className="px-4 pb-6">
          <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDFA)', border: '1px solid #A7F3D0' }}>
            <i className="fas fa-shield-halved text-[#0F766E] text-[1.1rem] mb-1.5" />
            <p className="text-[0.72rem] text-[#115E59] leading-relaxed">
              Be Rich ne demande <strong>jamais</strong> votre mot de passe ni votre code
              PIN. Tous les dépôts et retraits passent par <strong>YAS</strong> ou{' '}
              <strong>TRX</strong>. Taux de change : <strong>1 USD = 550 FCFA</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// Reusable pieces
// =====================================================================

function Pill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[0.62rem] font-semibold">
      <i className={`fas ${icon} text-[0.55rem]`} />
      {text}
    </span>
  );
}

/** A bullet row with a colored icon. */
function Row({ icon, color, title, children }: { icon: string; color: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}1A` }}>
        <i className={`fas ${icon} text-[0.7rem]`} style={{ color }} />
      </div>
      <div className="flex-1 text-[0.73rem] text-[#374151] leading-relaxed">
        {title && <span className="font-bold text-[#1F2937]">{title} · </span>}
        {children}
      </div>
    </div>
  );
}

/** A highlighted callout box. */
function Callout({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl p-3 flex items-start gap-2.5" style={{ background: `${color}12`, border: `1px solid ${color}33` }}>
      <i className={`fas ${icon} text-[0.8rem] mt-0.5 shrink-0`} style={{ color }} />
      <div className="text-[0.7rem] text-[#374151] leading-relaxed">{children}</div>
    </div>
  );
}

/** A simple key/value badge row. */
function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[0.72rem]">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-bold" style={{ color: valueColor || '#1F2937' }}>{value}</span>
    </div>
  );
}

// =====================================================================
// Section contents
// =====================================================================

function ConceptContent() {
  const teal = '#14B8A6';
  return (
    <>
      <Row icon="fa-handshake" color={teal} title="Le principe">
        Les <strong>entreprises</strong> paient pour leur <strong>visibilité</strong>.
        Vous regardez leurs vidéos, vous investissez, vous jouez —{' '}
        <strong>vous gagnez</strong>.
      </Row>
      <Row icon="fa-coins" color="#F59E0B" title="3 façons de gagner">
        <strong>Vidéos</strong>, <strong>investissements</strong> et{' '}
        <strong>roue de la fortune</strong>.
      </Row>
    </>
  );
}

function VideosContent() {
  const teal = '#14B8A6';
  return (
    <>
      <Row icon="fa-th-large" color={teal} title="5 vidéos par jour">
        <strong>5 vidéos</strong> différentes chaque jour. Regardez au moins{' '}
        <strong>30 %</strong> de chaque vidéo pour encaisser. La{' '}
        <strong>barre de progression</strong> indique le nombre de vidéos
        complétées (pas le montant gagné).
      </Row>
      <Row icon="fa-calendar-check" color="#22C55E" title="3 premiers jours : sans restriction">
        Pendant les <strong>3 premiers jours</strong> d&apos;inscription, vous regardez
        les 5 vidéos et gagnez <strong>sans aucune condition</strong>. Les gains sont
        crédités sur votre <strong>compte Vidéo</strong>.
      </Row>
      <Row icon="fa-arrow-up" color="#EF4444" title="Retrait dès le jour 1 · minimum $1">
        Vous pouvez retirer vos gains vidéo à partir de <strong>$1</strong> dès le{' '}
        <strong>jour 1</strong>, via <strong>YAS</strong> ou <strong>TRX</strong>.
      </Row>

      <Callout icon="fa-lock" color="#EF4444">
        <strong>Après 3 jours — conditions obligatoires :</strong> pour continuer
        à gagner de l&apos;argent en regardant les vidéos, vous devez avoir :
        <br /><br />
        1. <strong>Au moins 1 parrainage</strong> (quelqu&apos;un inscrit avec votre code)
        <br />
        2. <strong>Un dépôt d&apos;investissement actif</strong> (n&apos;importe quel niveau)
        <br /><br />
        <strong>Tous les 2 jours</strong> après le jour 3, vous devez parrainer
        une <strong>nouvelle personne</strong> pour continuer à gagner.
      </Callout>

      <Callout icon="fa-ban" color={teal}>
        <strong>Conditions non remplies ?</strong> La vidéo se lit normalement,
        mais <strong>aucun argent n&apos;est crédité</strong>. Un message vous
        informe des conditions manquantes.
      </Callout>
    </>
  );
}

function InvestContent() {
  const green = '#059669';
  const LEVELS = [
    { level: 1, name: 'Débutant', min: 5,   max: 15,   rate: 5, refs: 0,  color: '#22C55E', icon: 'fa-seedling' },
    { level: 2, name: 'Business', min: 65,  max: 250,  rate: 5, refs: 12, color: '#14B8A6', icon: 'fa-chart-line' },
    { level: 3, name: 'Elite',    min: 500, max: 3000, rate: 5, refs: 25, color: '#F59E0B', icon: 'fa-crown' },
  ];
  return (
    <>
      <Row icon="fa-chart-line" color={green} title="3 niveaux · 5 % par jour">
        Tous les niveaux rapportent <strong>5 %/jour</strong>. Investissez au{' '}
        <strong>niveau souhaité</strong> et les <strong>collectes journalières</strong>{' '}
        sont créditées directement sur votre <strong>compte Investissement</strong>.
      </Row>

      <div className="mt-2 space-y-2">
        {LEVELS.map((lvl) => (
          <div key={lvl.level} className="rounded-xl p-3 border" style={{ borderColor: `${lvl.color}33`, background: `${lvl.color}0A` }}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${lvl.color}26` }}>
                <i className={`fas ${lvl.icon} text-[0.8rem]`} style={{ color: lvl.color }} />
              </div>
              <div className="flex-1">
                <div className="text-[0.78rem] font-black text-[#1F2937]">Niveau {lvl.level} · {lvl.name}</div>
                <div className="text-[0.62rem] text-[#6B7280]">${lvl.min} – ${lvl.max}</div>
              </div>
              <div className="text-right">
                <div className="text-[0.78rem] font-black" style={{ color: lvl.color }}>+{lvl.rate}%</div>
                <div className="text-[0.55rem] text-[#6B7280]">par jour</div>
              </div>
            </div>
            <div className="text-[0.66rem] text-[#4B5563] flex items-center gap-1.5">
              <i className="fas fa-user-group text-[0.6rem]" style={{ color: lvl.color }} />
              {lvl.refs === 0
                ? <span><strong>Accès libre</strong></span>
                : <span>Déblocage : <strong>{lvl.refs} parrainés</strong></span>}
            </div>
          </div>
        ))}
      </div>

      <Callout icon="fa-right-left" color={green}>
        <strong>Collecte quotidienne versée sur votre compte Investissement.</strong>{' '}
        Le <strong>retrait est possible directement</strong> depuis ce compte
        via <strong>YAS</strong> ou <strong>TRX</strong>.
      </Callout>

      <Callout icon="fa-users" color="#EC4899">
        <strong>Commission parrainage :</strong> vous recevez <strong>5 %</strong> des
        gains quotidiens d&apos;investissement de chacun de vos filleuls,{' '}
        <strong>à vie</strong>, crédités sur votre <strong>compte Investissement</strong>.
      </Callout>

      <Callout icon="fa-user-shield" color="#F59E0B">
        <strong>Approbation admin requise.</strong> Le compte à rebours démarre{' '}
        <strong>après l&apos;approbation</strong>.
      </Callout>

      <Callout icon="fa-circle-info" color="#64748B">
        Les niveaux supérieurs nécessitent plus de parrainages pour débloquer
        la collecte. Plus vous parrainez, plus vous accédez à des niveaux élevés.
      </Callout>
    </>
  );
}

function GameContent() {
  const amber = '#F59E0B';
  return (
    <>
      <Row icon="fa-dice" color={amber} title="Principe">
        Tournez la roue et tentez de gagner de l&apos;argent réel.{' '}
        <strong>Jackpot de 10 $ possible !</strong>
      </Row>
      <Row icon="fa-clock" color="#22C55E" title="10 tours par jour">
        <strong>10 tours maximum/jour</strong>, réinitialisés à <strong>minuit</strong>.
      </Row>
      <Row icon="fa-hand-pointer" color={amber} title="Arrêt manuel ou automatique">
        <strong>Vous contrôlez l&apos;arrêt :</strong> appuyez sur <strong>ARRÊTER</strong>{' '}
        quand vous voulez, ou la roue s&apos;arrête automatiquement après{' '}
        <strong>3 secondes</strong>.
      </Row>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Coût par tour" value="0,20 $" valueColor="#EF4444" />
        <StatRow label="Jackpot maximum" value="10,00 $" valueColor={amber} />
        <StatRow label="Tours max / jour" value="10" valueColor="#1F2937" />
      </div>

      <Callout icon="fa-coins" color="#EF4444">
        <strong>Coût : 0,20 $/tour.</strong> Prélevé automatiquement dans cet ordre :{' '}
        <strong>compte Jeu</strong> → <strong>Investissement</strong> →{' '}
        <strong>Vidéo</strong> → <strong>Projet</strong> si le solde est insuffisant.
      </Callout>
    </>
  );
}

function AccountsContent() {
  const green = '#22C55E';
  const ACCOUNTS = [
    { name: 'Solde Total',           icon: 'fa-layer-group', color: '#6366F1', desc: 'Vue d\'ensemble · affiche la somme de tous vos comptes · pas un vrai compte' },
    { name: 'Compte Jeu',            icon: 'fa-dice',        color: '#F59E0B', desc: 'Roue de la fortune · les tours coûtent 0,20 $ prélevés ici en premier' },
    { name: 'Compte Investissement', icon: 'fa-chart-line',  color: '#059669', desc: 'Investissements par niveau · collectes journalières + commissions parrainage' },
    { name: 'Compte Projet',         icon: 'fa-building',    color: '#0F766E', desc: 'Pour les projets d\'entreprise' },
    { name: 'Compte Vidéo',          icon: 'fa-video',       color: '#14B8A6', desc: 'Gains de visionnage de vidéos · retrait dès $1' },
  ];
  return (
    <>
      <div className="mt-2 space-y-2">
        {ACCOUNTS.map((a) => (
          <div key={a.name} className="flex items-center gap-2.5 rounded-xl p-2.5 border" style={{ borderColor: `${a.color}33`, background: `${a.color}0A` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}26` }}>
              <i className={`fas ${a.icon} text-[0.85rem]`} style={{ color: a.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.78rem] font-black text-[#1F2937]">{a.name}</div>
              <div className="text-[0.62rem] text-[#6B7280] leading-snug">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Callout icon="fa-circle-info" color={green}>
        Le <strong>Solde Total</strong> est une vue d&apos;ensemble, pas un vrai compte.
        Les <strong>4 comptes réels</strong> sont : <strong>Jeu</strong>,{' '}
        <strong>Investissement</strong>, <strong>Projet</strong> et <strong>Vidéo</strong>.
      </Callout>

      <Callout icon="fa-arrow-up-from-bracket" color="#14B8A6">
        <strong>Bouton « Retirer »</strong> disponible depuis la carte d&apos;accueil
        pour <strong>tous les comptes</strong>. Vous choisissez le compte source lors du retrait.
      </Callout>
    </>
  );
}

function PaymentsContent() {
  const red = '#EF4444';
  return (
    <>
      {/* ---------- Taux de change ---------- */}
      <div className="rounded-xl p-3 border border-[#E5E7EB] bg-[#F9FAFB] mb-3">
        <StatRow label="Taux de change" value="1 USD = 550 FCFA" valueColor="#059669" />
      </div>

      {/* ---------- Dépôts ---------- */}
      <Row icon="fa-plus-circle" color="#22C55E" title="Comment déposer">
        Quand vous cliquez sur <strong>« Déposer »</strong>, vous choisissez{' '}
        d&apos;abord le <strong>compte destinataire</strong> :
      </Row>
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl p-2.5 border" style={{ borderColor: '#05966933', background: '#0596690A' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#05966926' }}>
            <i className="fas fa-chart-line text-[0.85rem]" style={{ color: '#059669' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.78rem] font-black text-[#1F2937]">Investissement</div>
            <div className="text-[0.62rem] text-[#6B7280] leading-snug">Vous accédez directement à la page des <strong>niveaux d&apos;investissement</strong></div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl p-2.5 border" style={{ borderColor: '#F59E0B33', background: '#F59E0B0A' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F59E0B26' }}>
            <i className="fas fa-dice text-[0.85rem]" style={{ color: '#F59E0B' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.78rem] font-black text-[#1F2937]">Jeu</div>
            <div className="text-[0.62rem] text-[#6B7280] leading-snug">Le processus habituel avec <strong>YAS</strong> ou <strong>TRX</strong> s&apos;ouvre</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl p-2.5 border" style={{ borderColor: '#0F766E33', background: '#0F766E0A' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#0F766E26' }}>
            <i className="fas fa-building text-[0.85rem]" style={{ color: '#0F766E' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.78rem] font-black text-[#1F2937]">Projet</div>
            <div className="text-[0.62rem] text-[#6B7280] leading-snug">Le processus habituel avec <strong>YAS</strong> ou <strong>TRX</strong> s&apos;ouvre</div>
          </div>
        </div>
      </div>

      {/* ---------- Méthodes de paiement ---------- */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl p-3 border border-[#FECACA] bg-[#FEF2F2]">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center mb-2">
            <i className="fas fa-mobile-screen text-[#EF4444] text-[0.85rem]" />
          </div>
          <div className="text-[0.82rem] font-black text-[#1F2937]">YAS</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">Mobile money (Togo) · 550 FCFA = 1 USD</div>
        </div>
        <div className="rounded-xl p-3 border border-[#FECACA] bg-[#FEF2F2]">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center mb-2">
            <i className="fas fa-coins text-[#EF4444] text-[0.85rem]" />
          </div>
          <div className="text-[0.82rem] font-black text-[#1F2937]">TRX</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">Crypto (Tron) · min $5</div>
        </div>
      </div>

      {/* ---------- Retraits ---------- */}
      <div className="mt-3">
        <Row icon="fa-arrow-up-from-bracket" color="#14B8A6" title="Retrait depuis tous les comptes">
          Le retrait est possible depuis <strong>tous vos comptes</strong> :{' '}
          <strong>Jeu</strong>, <strong>Investissement</strong>, <strong>Projet</strong>{' '}
          et <strong>Vidéo</strong>, via <strong>YAS</strong> ou <strong>TRX</strong>.
        </Row>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Min. retrait Vidéo" value="1 $" valueColor="#14B8A6" />
        <StatRow label="Min. retrait (autres)" value="5 $" valueColor="#EF4444" />
        <StatRow label="Disponibilité des fonds" value="6 heures" valueColor="#F59E0B" />
        <StatRow label="Dépôts" value="Investissement · Jeu · Projet" valueColor="#22C55E" />
        <StatRow label="Retraits" value="Tous les comptes" valueColor="#14B8A6" />
      </div>

      <Callout icon="fa-rotate" color="#F59E0B">
        <strong>Actualisez votre page régulièrement</strong> après une opération pour voir
        votre solde à jour.
      </Callout>

      <Callout icon="fa-user-shield" color={red}>
        <strong>Approbation admin requise</strong> pour les dépôts et retraits.
      </Callout>
    </>
  );
}

function ReferralContent() {
  const pink = '#EC4899';
  return (
    <>
      <Row icon="fa-gift" color={pink} title="Votre code BR-XXXXXX">
        Visible dans votre <strong>Profil</strong>. Partagez-le : vos amis doivent{' '}
        <strong>s&apos;inscrire</strong> avec pour être comptabilisés.
      </Row>
      <Row icon="fa-share-nodes" color={pink} title="Partage">
        Bouton <strong>Invitez vos amis</strong> puis <strong>Copier le lien</strong> ou
        partage native (WhatsApp, TikTok, Telegram…).
      </Row>

      <Callout icon="fa-percent" color="#059669">
        <strong>5 % de commission à vie :</strong> vous recevez <strong>5 %</strong> de{' '}
        <strong>tous les gains quotidiens d&apos;investissement</strong> de chaque filleul,{' '}
        <strong>indéfiniment</strong>. Cette commission est créditée directement
        sur votre <strong>compte Investissement</strong>.
      </Callout>

      <Callout icon="fa-trophy" color={pink}>
        <strong>12 parrainés = 5 $ de cadeau</strong> sur votre compte principal +{' '}
        <strong>message de félicitations</strong>.
      </Callout>

      <Row icon="fa-unlock" color="#F59E0B" title="Débloquer les niveaux">
        Niveau 2 (Business) = <strong>12 parrainés</strong>. Niveau 3 (Elite) ={' '}
        <strong>25 parrainés</strong>.
      </Row>

      <Callout icon="fa-video" color="#14B8A6">
        <strong>Parrainage et vidéos :</strong> après 3 jours, il faut avoir{' '}
        <strong>au moins 1 parrainage</strong> + un <strong>dépôt d&apos;investissement</strong>{' '}
        pour continuer à gagner avec les vidéos. Ensuite, <strong>tous les 2 jours</strong>,
        vous devez parrainer une <strong>nouvelle personne</strong> pour maintenir vos gains vidéo.
      </Callout>

      <Callout icon="fa-shield-halved" color="#EF4444">
        <strong>Anti-doublon :</strong> le même nom, email ou numéro de téléphone
        ne peut pas être utilisé pour créer <strong>plusieurs comptes</strong>.
        Chaque utilisateur doit avoir des informations uniques.
      </Callout>
    </>
  );
}

function NavContent() {
  const slate = '#64748B';
  const tabs = [
    { icon: 'fa-video',     label: 'Vidéos',     desc: 'Regarder les vidéos du jour',     color: '#14B8A6' },
    { icon: 'fa-coins',     label: 'Make Money', desc: 'Investir · Jeu · Projets',        color: '#059669' },
    { icon: 'fa-compass',   label: 'Guide',      desc: 'Cette page',                       color: slate },
    { icon: 'fa-user',      label: 'Profil',     desc: 'Compte, parrainage, paramètres',  color: '#F59E0B' },
  ];
  return (
    <>
      <div className="mt-2 space-y-2">
        {tabs.map((t, i) => (
          <div key={t.label} className="flex items-center gap-3 rounded-xl p-2.5 border border-[#E5E7EB] bg-[#F9FAFB]">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${t.color}1A` }}>
              <i className={`fas ${t.icon} text-[0.85rem]`} style={{ color: t.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.78rem] font-black text-[#1F2937]">
                <span className="text-[#9CA3AF] mr-1.5">{i + 1}.</span>{t.label}
              </div>
              <div className="text-[0.62rem] text-[#6B7280] truncate">{t.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}