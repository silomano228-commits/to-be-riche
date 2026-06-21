'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Header, LogoImg, INVEST_LEVELS } from '@/components/shared';

// =====================================================================
// Be Rich — Guide complet
// Tous les comptes, méthodes de paiement et mécaniques de l'app.
// =====================================================================

type SectionId =
  | 'videos'
  | 'invest'
  | 'game'
  | 'account'
  | 'payments'
  | 'referral'
  | 'ads'
  | 'nav';

interface SectionDef {
  id: SectionId;
  label: string;
  icon: string;
  color: string;
  summary: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'videos',   label: 'Plateforme Vidéo',           icon: 'fa-video',         color: '#14B8A6', summary: "Les entreprises vous paient pour regarder leurs vidéos" },
  { id: 'invest',   label: 'Make Money — Investissement', icon: 'fa-chart-line',    color: '#059669', summary: '3 niveaux · 5% par jour · collecte illimitée' },
  { id: 'game',     label: 'Jeu — Roue de la Fortune',   icon: 'fa-dice',          color: '#F59E0B', summary: '10 tours/jour · $0.10 à $1.00 · bouton ARRÊTER' },
  { id: 'account',  label: 'Compte Principal',           icon: 'fa-wallet',        color: '#22C55E', summary: 'Solde pour le jeu et les petites collectes' },
  { id: 'payments', label: 'Méthodes de Paiement',       icon: 'fa-credit-card',   color: '#EF4444', summary: 'YAS & TRX · min $5 / $1 · 6 heures' },
  { id: 'referral', label: 'Parrainage',                 icon: 'fa-gift',          color: '#EC4899', summary: 'BR-XXXXX · 12 (Niv.2) · 25 (Niv.3) · 3 jours vidéo' },
  { id: 'ads',      label: 'Publicités',                 icon: 'fa-bullhorn',      color: '#F97316', summary: '46 entreprises · 6 layouts visuels · fermables' },
  { id: 'nav',      label: 'Navigation',                 icon: 'fa-compass',       color: '#64748B', summary: '4 onglets : Vidéos · Make Money · Guide · Profil' },
];

export default function GuideScreen() {
  const { user } = useAppStore();
  const [open, setOpen] = useState<Set<SectionId>>(new Set<SectionId>(['videos']));

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
                  Plateforme de communication pour les grandes entreprises. Les sociétés
                  chinoises, japonaises et indiennes — et désormais aussi coréennes,
                  américaines et européennes — vous paient pour regarder leurs vidéos
                  promotionnelles.
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
              Touchez une section ci-dessous pour la déplier. Chaque rubrique explique comment
              gagner et retirer votre argent en toute sécurité.
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
                    <i className={`fas ${s.icon} text-[0.95rem]`} style={{ color: s.color }} />
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
                      {s.id === 'videos' && <VideosContent />}
                      {s.id === 'invest' && <InvestContent />}
                      {s.id === 'game' && <GameContent />}
                      {s.id === 'account' && <AccountContent />}
                      {s.id === 'payments' && <PaymentsContent />}
                      {s.id === 'referral' && <ReferralContent />}
                      {s.id === 'ads' && <AdsContent />}
                      {s.id === 'nav' && <NavContent />}
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
              <strong>TRX</strong> et sont disponibles dans les <strong>6 heures</strong>.
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

/** A small subsection heading inside an accordion body. */
function SubHead({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1 mt-3 first:mt-0">
      <div className="h-3 w-1 rounded-full" style={{ background: color }} />
      <h4 className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide">{title}</h4>
    </div>
  );
}

/** A bullet row with a colored icon. */
function Row({ icon, color, title, children }: { icon: string; color: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
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

/** A simple key/value badge row (used for payment methods, levels, etc.). */
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

function VideosContent() {
  const teal = '#14B8A6';
  return (
    <>
      <SubHead title="Le concept" color={teal} />
      <Row icon="fa-handshake" color={teal} title="Gagnant-gagnant">
        Be Rich met en relation les grandes entreprises (chinoises, japonaises, indiennes,
        et désormais aussi coréennes, américaines et européennes) et vous. Elles vous paient
        pour regarder leurs vidéos promotionnelles courtes. Elles gagnent en visibilité, vous
        gagnez de l'argent.
      </Row>
      <Row icon="fa-coins" color="#22C55E" title="Récompense">
        $0.15 à $0.30 par vidéo regardée, crédités sur votre{' '}
        <strong>compte Vidéo</strong>.
      </Row>

      <SubHead title="Comment regarder" color={teal} />
      <Row icon="fa-th-large" color={teal} title="5 vidéos visibles à la fois">
        La page affiche <strong>5 vidéos en même temps</strong> (grille 2 colonnes). Chaque
        jour, <strong>5 nouvelles vidéos</strong> d'entreprises différentes sont disponibles —
        elles changent tous les jours.
      </Row>
      <Row icon="fa-chart-simple" color="#22C55E" title="Image de progression des gains">
        Une <strong>barre de progression verte</strong> affiche vos gains du jour et{' '}
        <strong>augmente normalement</strong> à chaque vidéo regardée, jusqu'à l'objectif
        quotidien.
      </Row>
      <Row icon="fa-door-open" color="#F59E0B" title="Quitter à tout moment">
        Un bouton <strong>X rouge</strong> reste toujours visible, ainsi qu'un bouton{' '}
        <strong>Quitter la vidéo</strong>. Vous pouvez quitter la vidéo quand vous le souhaitez.
      </Row>

      <SubHead title="Le compte Vidéo" color={teal} />
      <Row icon="fa-wallet" color={teal} title="Alimenté UNIQUEMENT par les vidéos">
        Le compte Vidéo a son <strong>propre solde</strong>. <strong>Aucun dépôt</strong>{' '}
        n'est possible sur ce compte : il est alimenté <strong>uniquement</strong> par les
        récompenses de visionnage.
      </Row>
      <Row icon="fa-arrow-up" color="#EF4444" title="Retrait minimum $1">
        Vous pouvez retirer vos gains vidéo par <strong>YAS</strong> ou <strong>TRX</strong> à
        partir de <strong>$1</strong> (converti en dollars). Fonds disponibles dans les{' '}
        <strong>6 heures</strong>.
      </Row>
      <Row icon="fa-circle-exclamation" color="#F59E0B" title="Messages d'erreur clairs">
        Si un retrait est impossible (solde insuffisant, action requise, etc.), un{' '}
        <strong>message clair</strong> vous indique exactement quoi faire.
      </Row>

      <SubHead title="Règle des 3 jours (retraits vidéo)" color={teal} />
      <Row icon="fa-calendar-xmark" color="#F59E0B" title="Pour continuer à retirer">
        Après <strong>3 jours</strong> de visionnage, pour continuer à faire des{' '}
        <strong>retraits</strong>, vous devez : (1) avoir un <strong>investissement actif au
        Niveau 1</strong>, ET (2) avoir invité au moins <strong>1 parrainé</strong>. Le
        visionnage reste autorisé pendant ce temps.
      </Row>
      <Row icon="fa-arrow-trend-up" color="#EC4899" title="Le nombre augmente à chaque cycle">
        À chaque <strong>cycle de 3 jours</strong>, le nombre de parrainés requis augmente :
        cycle 1 = 1, cycle 2 = 2, cycle 3 = 3, etc.
      </Row>

      <Callout icon="fa-user-shield" color={teal}>
        L'administrateur peut ajouter des <strong>liens vidéo personnalisés</strong> que tous
        les utilisateurs regarderont. Ces vidéos prioritaires apparaissent avant le catalogue
        quotidien.
      </Callout>
    </>
  );
}

function InvestContent() {
  const green = '#059669';
  return (
    <>
      <SubHead title="Le principe" color={green} />
      <Row icon="fa-chart-line" color={green} title="3 niveaux d'investissement">
        Choisissez un niveau, investissez un montant dans sa plage, et gagnez{' '}
        <strong>5% par jour</strong> sur votre mise — à <strong>tous les niveaux</strong>.
      </Row>
      <Row icon="fa-infinity" color="#22C55E" title="Tout est illimité">
        <strong>Collecte quotidienne illimitée</strong> (jamais de fin) ET{' '}
        <strong>nombre d'investissements illimité</strong> — vous pouvez créer autant
        d'investissements que vous voulez à chaque niveau débloqué.
      </Row>

      <SubHead title="Les 3 niveaux" color={green} />
      <div className="mt-2 space-y-2">
        {INVEST_LEVELS.map((lvl) => (
          <div key={lvl.level} className="rounded-xl p-3 border" style={{ borderColor: `${lvl.color}33`, background: `${lvl.color}0A` }}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${lvl.color}26` }}>
                <i className={`fas ${lvl.icon} text-[0.8rem]`} style={{ color: lvl.color }} />
              </div>
              <div className="flex-1">
                <div className="text-[0.78rem] font-black text-[#1F2937]">Niveau {lvl.level} · {lvl.name}</div>
                <div className="text-[0.62rem] text-[#6B7280]">Investissement ${lvl.min} – ${lvl.max}</div>
              </div>
              <div className="text-right">
                <div className="text-[0.78rem] font-black" style={{ color: lvl.color }}>+{lvl.rate}%</div>
                <div className="text-[0.55rem] text-[#6B7280]">par jour</div>
              </div>
            </div>
            <div className="text-[0.66rem] text-[#4B5563] flex items-center gap-1.5">
              <i className="fas fa-user-group text-[0.6rem]" style={{ color: lvl.color }} />
              {lvl.requiredReferrals === 0
                ? <span><strong>Accès libre</strong> — aucun parrainage requis</span>
                : <span>Déblocage : <strong>{lvl.requiredReferrals} parrainés inscrits</strong></span>}
            </div>
          </div>
        ))}
      </div>

      <SubHead title="Déposer" color={green} />
      <Row icon="fa-arrow-down" color="#22C55E" title="Dépôt direct par YAS ou TRX">
        À <strong>tous les niveaux</strong>, le dépôt se fait <strong>directement</strong> par
        YAS ou TRX. <strong>Il n'y a plus de solde d'investissement</strong> à recharger au
        préalable. Fonds disponibles dans les <strong>6 heures</strong>.
      </Row>

      <SubHead title="Collecter vos gains" color={green} />
      <Row icon="fa-arrow-up" color="#EF4444" title="Option 1 — Retrait par YAS ou TRX">
        Si votre gain est <strong>≥ $5</strong>, vous pouvez le retirer directement par YAS ou
        TRX. Fonds disponibles dans les <strong>6 heures</strong>.
      </Row>
      <Row icon="fa-wallet" color="#22C55E" title="Option 2 — Compte principal">
        Versement sur le compte principal, <strong>sans minimum</strong>. Si le gain est{' '}
        <strong>&lt; $5</strong>, seul ce versement est disponible.
      </Row>

      <SubHead title="Débloquer les niveaux supérieurs" color={green} />
      <Row icon="fa-user-group" color="#EC4899" title="Parrainage uniquement">
        Le déblocage est <strong>gratuit</strong> et repose <strong>uniquement sur le
        parrainage</strong> (plus besoin d'investir au niveau précédent) : Niveau 2 ={' '}
        <strong>12 parrainés</strong>, Niveau 3 = <strong>25 parrainés</strong>.
      </Row>
      <Callout icon="fa-circle-info" color={green}>
        Le Niveau 1 (Débutant) est en <strong>accès libre</strong>. Les niveaux 2 et 3 se
        débloquent via le parrainage. Le solde d'investissement a été{' '}
        <strong>supprimé</strong> — tout se fait par dépôt direct YAS / TRX.
      </Callout>
    </>
  );
}

function GameContent() {
  const amber = '#F59E0B';
  return (
    <>
      <SubHead title="La Roue de la Fortune" color={amber} />
      <Row icon="fa-dice" color={amber} title="Principe">
        Tournez la roue et tentez de gagner des récompenses en argent à chaque tour.
      </Row>
      <Row icon="fa-clock" color="#22C55E" title="10 tours gratuits par jour">
        Vous disposez de <strong>10 tours gratuits</strong> chaque jour. La roue se
        réinitialise à <strong>minuit</strong>. Pas de tours payants.
      </Row>

      <SubHead title="Récompenses & probabilités" color={amber} />
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Récompense par tour gagnant" value="$0.10 – $1.00" valueColor="#F59E0B" />
        <StatRow label="Taux de gain" value="30% – 60%" valueColor="#22C55E" />
        <StatRow label="Généralement" value="sous 45%" valueColor="#6B7280" />
        <StatRow label="Détermination" value="aléatoire, non divulgué" valueColor="#6B7280" />
      </div>

      <SubHead title="La roue" color={amber} />
      <Row icon="fa-text-height" color="#22C55E" title="Texte lisible (radial)">
        Les récompenses sur la roue sont écrites <strong>radialement</strong> (du centre vers
        l'extérieur), avec un contour sombre pour une <strong>parfaite lisibilité</strong> sur
        toutes les couleurs.
      </Row>
      <Row icon="fa-hand-paper" color="#EF4444" title="Bouton ARRÊTER">
        Vous pouvez <strong>arrêter la roue vous-même</strong> à tout moment avec le bouton{' '}
        <strong>ARRÊTER LA ROUE</strong> — la roue s'arrête proprement sur le segment défini.
      </Row>

      <SubHead title="Où vont les gains" color={amber} />
      <Row icon="fa-wallet" color="#22C55E" title="Compte principal">
        <strong>Toutes les opérations du jeu</strong> se font sur le{' '}
        <strong>compte principal</strong> (solde <code className="bg-[#F3F4F6] px-1 rounded text-[0.65rem]">balance</code>).
        Les gains sont crédités directement sur ce solde.
      </Row>

      <SubHead title="Popups" color={amber} />
      <Row icon="fa-trophy" color="#22C55E" title="À chaque gain">
        Un popup de <strong>félicitations</strong> (avec confettis) apparaît avec le montant gagné.
      </Row>
      <Row icon="fa-redo" color="#EF4444" title="À chaque perte">
        Un message de <strong>retry</strong> s'affiche avec un conseil motivant pour réessayer
        si vous avez des tours restants.
      </Row>
    </>
  );
}

function AccountContent() {
  const green = '#22C55E';
  return (
    <>
      <SubHead title="Qu'est-ce que le compte principal ?" color={green} />
      <Row icon="fa-wallet" color={green} title="Le solde de base">
        Le <strong>compte principal</strong> (solde <code className="bg-[#F3F4F6] px-1 rounded text-[0.65rem]">balance</code>)
        est le solde central de l'application.
      </Row>

      <SubHead title="À quoi il sert" color={green} />
      <Row icon="fa-dice" color="#F59E0B" title="Gains du jeu">
        Toutes les récompenses de la Roue de la Fortune sont créditées sur le compte principal.
      </Row>
      <Row icon="fa-chart-line" color="#059669" title="Petites collectes d'investissement">
        Les collectes d'investissement <strong>&lt; $5</strong> sont versées sur le compte
        principal (sans minimum).
      </Row>

      <SubHead title="Dépôt & retrait" color={green} />
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Dépôt minimum" value="$5" valueColor="#22C55E" />
        <StatRow label="Retrait minimum" value="$5" valueColor="#EF4444" />
        <StatRow label="Méthodes" value="YAS ou TRX" valueColor="#1F2937" />
        <StatRow label="Disponibilité des fonds" value="6 heures" valueColor="#F59E0B" />
      </div>

      <Callout icon="fa-circle-info" color={green}>
        Le compte principal est séparé du <strong>compte Vidéo</strong>, qui a son propre solde
        et ses propres retraits (minimum $1).
      </Callout>
    </>
  );
}

function PaymentsContent() {
  const red = '#EF4444';
  return (
    <>
      <SubHead title="Deux méthodes disponibles" color={red} />
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl p-3 border border-[#FECACA] bg-[#FEF2F2]">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center mb-2">
            <i className="fas fa-mobile-screen text-[#EF4444] text-[0.85rem]" />
          </div>
          <div className="text-[0.82rem] font-black text-[#1F2937]">YAS</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">Mobile money en FCFA</div>
        </div>
        <div className="rounded-xl p-3 border border-[#FECACA] bg-[#FEF2F2]">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center mb-2">
            <i className="fas fa-coins text-[#EF4444] text-[0.85rem]" />
          </div>
          <div className="text-[0.82rem] font-black text-[#1F2937]">TRX</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">Cryptomonnaie (Tron)</div>
        </div>
      </div>

      <SubHead title="Règles communes" color={red} />
      <Row icon="fa-layer-group" color={red} title="Tous les comptes & niveaux">
        YAS et TRX sont disponibles à <strong>tous les niveaux</strong> et pour{' '}
        <strong>tous les comptes</strong> (Vidéo, Investissement, Compte principal).
      </Row>

      <SubHead title="Montants minimums" color={red} />
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Compte principal — dépôt / retrait" value="$5" valueColor="#22C55E" />
        <StatRow label="Compte Vidéo — retrait" value="$1" valueColor="#14B8A6" />
        <StatRow label="Collecte investissement par YAS / TRX" value="$5 de gain" valueColor="#059669" />
      </div>

      <Row icon="fa-clock" color="#F59E0B" title="Disponibilité 6 heures">
        Dès qu'un dépôt ou retrait est lancé, les fonds sont disponibles dans les{' '}
        <strong>6 heures</strong>. Un message de confirmation vous informe à chaque étape.
      </Row>

      <Callout icon="fa-shield-halved" color={red}>
        Ne communiquez <strong>jamais</strong> votre mot de passe ou code PIN. Les transactions
        sont traitées uniquement via YAS ou TRX.
      </Callout>
    </>
  );
}

function ReferralContent() {
  const pink = '#EC4899';
  return (
    <>
      <SubHead title="Votre code de parrainage" color={pink} />
      <Row icon="fa-gift" color={pink} title="Format BR-XXXXX">
        Votre code personnel (au format <strong>BR-XXXXX</strong>) est visible dans votre{' '}
        <strong>Profil</strong>. Partagez-le avec vos amis pour les parrainer.
      </Row>

      <SubHead title="Partage facile" color={pink} />
      <Row icon="fa-share-nodes" color={pink} title="Feuille de partage native">
        Cliquez sur <strong>Partager</strong> pour ouvrir la feuille de partage native de votre
        téléphone. Le lien inclut automatiquement votre code.
      </Row>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['WhatsApp', 'TikTok', 'Instagram', 'Telegram', 'Facebook', 'SMS'].map((n) => (
          <span key={n} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FCE7F3] text-[#9D174D] text-[0.62rem] font-semibold">
            <i className="fas fa-check text-[0.5rem]" />
            {n}
          </span>
        ))}
      </div>

      <SubHead title="Pourquoi parrainer ?" color={pink} />
      <Row icon="fa-unlock" color="#F59E0B" title="Débloquer les niveaux d'investissement">
        Le parrainage est <strong>obligatoire</strong> pour débloquer les niveaux supérieurs :
        <strong>12 parrainés</strong> pour le Niveau 2 (Business), <strong>25 parrainés</strong>{' '}
        pour le Niveau 3 (Elite).
      </Row>
      <Row icon="fa-calendar-xmark" color="#14B8A6" title="Règle des 3 jours (retraits vidéo)">
        Après 3 jours de visionnage, pour continuer à <strong>retirer</strong> vos gains vidéo,
        vous devez avoir un investissement actif au Niveau 1 <strong>ET</strong> au moins 1
        parrainé. Le nombre de parrainés requis <strong>augmente à chaque cycle</strong> de 3
        jours (cycle 1 = 1, cycle 2 = 2, etc.).
      </Row>

      <Callout icon="fa-circle-info" color={pink}>
        Le parrainé doit <strong>s'inscrire</strong> avec votre code pour être comptabilisé.
        Inviter ne suffit pas — l'inscription est essentielle.
      </Callout>
    </>
  );
}

function AdsContent() {
  const orange = '#F97316';
  return (
    <>
      <SubHead title="Affiches publicitaires" color={orange} />
      <Row icon="fa-bullhorn" color={orange} title="Au changement d'onglet">
        Des affiches publicitaires d'entreprises apparaissent lors du{' '}
        <strong>changement d'onglet</strong> dans l'application.
      </Row>
      <Row icon="fa-xmark" color="#22C55E" title="Fermables">
        Chaque publicité est <strong>fermable</strong> avec un petit{' '}
        <strong>X</strong> en haut de l'affiche. Aucune obligation de regarder.
      </Row>

      <SubHead title="Une grande variété" color={orange} />
      <Row icon="fa-building" color="#F59E0B" title="46 entreprises">
        Pas moins de <strong>46 entreprises</strong> différentes apparaissent dans les
        publicités — plus jamais "toutes se ressemblent".
      </Row>
      <Row icon="fa-shapes" color="#14B8A6" title="6 layouts visuels distincts">
        Les publicités utilisent <strong>6 modèles visuels différents</strong> (hero, split,
        banner, card, quote, stats) pour une grande variété visuelle.
      </Row>

      <Callout icon="fa-handshake" color={orange}>
        Ces publicités financent une partie des récompenses que vous touchez en regardant les
        vidéos d'entreprises.
      </Callout>
    </>
  );
}

function NavContent() {
  const slate = '#64748B';
  const tabs = [
    { icon: 'fa-video', label: 'Vidéos', desc: 'Plateforme de visionnage', color: '#14B8A6' },
    { icon: 'fa-coins', label: 'Make Money', desc: 'Investir · Jeu · Projets', color: '#059669' },
    { icon: 'fa-compass', label: 'Guide', desc: 'Cette page', color: slate },
    { icon: 'fa-user', label: 'Profil', desc: 'Compte, parrainage, paramètres', color: '#F59E0B' },
  ];
  return (
    <>
      <SubHead title="4 onglets en bas d'écran" color={slate} />
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

      <Callout icon="fa-trash-can" color="#EF4444">
        L'onglet <strong>Finance</strong> a été <strong>supprimé</strong>. Les dépôts et
        retraits se font désormais directement depuis chaque fonctionnalité (Vidéos, Make
        Money, etc.) ou depuis le Profil.
      </Callout>
    </>
  );
}
