'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';

// =====================================================================
// Be Rich — Guide simplifié
// 8 sections essentielles : Concept, Vidéos, Investissement, Jeu,
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
  { id: 'videos',   label: 'La Plateforme Vidéo',            icon: 'fa-video',          color: '#14B8A6', summary: '5 vidéos/jour · $0.15 à $0.30 · retrait dès $1' },
  { id: 'invest',   label: "L'Investissement (Make Money)",  icon: 'fa-chart-line',     color: '#059669', summary: '3 niveaux · 5%/jour · approbation admin requise' },
  { id: 'game',     label: 'Le Jeu de Roue',                 icon: 'fa-dice',           color: '#F59E0B', summary: '10 tours/jour · bouton ARRÊTER · gains sur compte principal' },
  { id: 'accounts', label: 'Les Comptes',                    icon: 'fa-wallet',         color: '#22C55E', summary: 'Principal · Jeu · Investissement · Vidéo · Projet' },
  { id: 'payments', label: 'Dépôts et Retraits',             icon: 'fa-credit-card',    color: '#EF4444', summary: 'YAS & TRX · min $5 / $1 · approbation sous 6h' },
  { id: 'referral', label: 'Parrainage',                     icon: 'fa-gift',           color: '#EC4899', summary: 'Code BR-XXXXXX · débloque les niveaux et les retraits vidéo' },
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
        Be Rich est une plateforme où les <strong>grandes entreprises</strong> vous paient
        pour regarder leurs <strong>vidéos promotionnelles</strong>. Elles gagnent en
        visibilité, vous gagnez de l&apos;argent.
      </Row>
      <Row icon="fa-globe" color="#059669" title="Entreprises du monde entier">
        Sociétés <strong>chinoises, japonaises, indiennes, coréennes, américaines et
        européennes</strong> publient leurs vidéos chaque jour.
      </Row>
      <Row icon="fa-coins" color="#F59E0B" title="3 façons de gagner">
        Regarder des <strong>vidéos</strong>, <strong>investir</strong> dans les niveaux
        Make Money, ou jouer à la <strong>roue de la fortune</strong>.
      </Row>

      <Callout icon="fa-rocket" color={teal}>
        Plus vous êtes actif (vidéos + parrainage), plus vous débloquez de niveaux
        d&apos;investissement et de retraits.
      </Callout>
    </>
  );
}

function VideosContent() {
  const teal = '#14B8A6';
  return (
    <>
      <Row icon="fa-th-large" color={teal} title="5 vidéos par jour">
        La page affiche <strong>5 vidéos</strong> différentes chaque jour. Elles changent
        toutes les 24h.
      </Row>
      <Row icon="fa-coins" color="#22C55E" title="Récompense">
        <strong>$0.15 à $0.30</strong> par vidéo, crédités sur votre{' '}
        <strong>compte Vidéo</strong>. Regardez au moins <strong>30%</strong> de la vidéo
        pour encaisser.
      </Row>
      <Row icon="fa-door-open" color="#F59E0B" title="Quitter à tout moment">
        Un bouton <strong>X rouge</strong> reste visible : vous pouvez quitter la vidéo
        quand vous le souhaitez.
      </Row>
      <Row icon="fa-arrow-up" color="#EF4444" title="Retrait minimum $1">
        Retirez vos gains vidéo par YAS ou TRX à partir de <strong>$1</strong>. Fonds
        disponibles dans les <strong>6 heures</strong>.
      </Row>

      <Callout icon="fa-calendar-xmark" color={teal}>
        <strong>Règle des 3 jours :</strong> après 3 jours, pour continuer à retirer vos
        gains vidéo, vous devez avoir un <strong>investissement Niveau 1 actif</strong> ET
        des <strong>parrainés</strong>. Le nombre de parrainés requis{' '}
        <strong>augmente à chaque cycle</strong> (cycle 1 = 1, cycle 2 = 2, etc.).
      </Callout>
    </>
  );
}

function InvestContent() {
  const green = '#059669';
  const LEVELS = [
    { level: 1, name: 'Débutant',      min: 5,   max: 15,   rate: 5, refs: 0,  color: '#22C55E', icon: 'fa-seedling' },
    { level: 2, name: 'Intermédiaire', min: 65,  max: 250,  rate: 5, refs: 12, color: '#14B8A6', icon: 'fa-chart-line' },
    { level: 3, name: 'Expert',        min: 500, max: 3000, rate: 5, refs: 25, color: '#F59E0B', icon: 'fa-crown' },
  ];
  return (
    <>
      <Row icon="fa-chart-line" color={green} title="3 niveaux · 5% par jour">
        Choisissez un niveau, déposez un montant dans sa plage, gagnez{' '}
        <strong>5% chaque jour</strong>. Investissements <strong>illimités</strong> et{' '}
        <strong>retrait quotidien de 5%</strong>.
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
                ? <span><strong>Accès libre</strong> — aucun parrainage requis</span>
                : <span>Déblocage : <strong>{lvl.refs} parrainés inscrits</strong></span>}
            </div>
          </div>
        ))}
      </div>

      <Callout icon="fa-user-shield" color="#F59E0B">
        <strong>Approbation admin requise.</strong> Après votre dépôt (YAS ou TRX — même
        système que le compte principal), l&apos;administrateur doit{' '}
        <strong>approuver</strong> votre demande. L&apos;investissement démarre et le{' '}
        <strong>compte à rebours commence seulement après cette approbation</strong>.
      </Callout>
    </>
  );
}

function GameContent() {
  const amber = '#F59E0B';
  return (
    <>
      <Row icon="fa-dice" color={amber} title="Principe">
        Tournez la roue et tentez de gagner de l&apos;argent réel à chaque tour.
      </Row>
      <Row icon="fa-clock" color="#22C55E" title="10 tours gratuits par jour">
        <strong>10 tours gratuits</strong> chaque jour, réinitialisés à{' '}
        <strong>minuit</strong>. Pas de tours payants.
      </Row>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Récompense par tour gagnant" value="$0.10 – $1.00" valueColor="#F59E0B" />
        <StatRow label="Taux de gain" value="30% – 60%" valueColor="#22C55E" />
        <StatRow label="Gains versés sur" value="Compte Principal" valueColor="#1F2937" />
      </div>

      <Callout icon="fa-hand-paper" color={amber}>
        <strong>Vous contrôlez l&apos;arrêt.</strong> Un bouton{' '}
        <strong>ARRÊTER LA ROUE</strong> vous laisse stopper la roue quand vous le souhaitez
        — la roue s&apos;arrête proprement sur le segment visé.
      </Callout>
    </>
  );
}

function AccountsContent() {
  const green = '#22C55E';
  const ACCOUNTS = [
    { name: 'Compte Principal',     icon: 'fa-wallet',     color: '#22C55E', desc: 'Dépôts, retraits et gains du jeu de roue' },
    { name: 'Compte Jeu',           icon: 'fa-dice',       color: '#F59E0B', desc: 'Pour jouer à la roue (10 tours/jour)' },
    { name: 'Compte Investissement',icon: 'fa-chart-line', color: '#059669', desc: '5%/jour · dépôt sous approbation admin' },
    { name: 'Compte Vidéo',         icon: 'fa-video',      color: '#14B8A6', desc: 'Gains vidéo uniquement · retrait dès $1' },
    { name: 'Compte Projet',        icon: 'fa-building',   color: '#0F766E', desc: 'Pour les projets d&apos;entreprise' },
  ];
  return (
    <>
      <Row icon="fa-wallet" color={green} title="5 comptes séparés">
        Chaque compte a son propre solde et son usage. Vous pouvez déposer et retirer
        depuis chaque compte avec le même système YAS / TRX.
      </Row>

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

      <Callout icon="fa-user-shield" color="#F59E0B">
        Les <strong>dépôts et retraits d&apos;investissement</strong> nécessitent une{' '}
        <strong>approbation admin</strong> (fonds disponibles sous 6h).
      </Callout>
    </>
  );
}

function PaymentsContent() {
  const red = '#EF4444';
  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl p-3 border border-[#FECACA] bg-[#FEF2F2]">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center mb-2">
            <i className="fas fa-mobile-screen text-[#EF4444] text-[0.85rem]" />
          </div>
          <div className="text-[0.82rem] font-black text-[#1F2937]">YAS</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">Mobile money (Togo)</div>
        </div>
        <div className="rounded-xl p-3 border border-[#FECACA] bg-[#FEF2F2]">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center mb-2">
            <i className="fas fa-coins text-[#EF4444] text-[0.85rem]" />
          </div>
          <div className="text-[0.82rem] font-black text-[#1F2937]">TRX</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">Crypto (Tron)</div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-3">
        <StatRow label="Dépôt Compte Principal" value="$5 min" valueColor="#22C55E" />
        <StatRow label="Retrait Compte Vidéo" value="$1 min" valueColor="#14B8A6" />
        <StatRow label="Disponibilité des fonds" value="6 heures" valueColor="#F59E0B" />
      </div>

      <Row icon="fa-mobile-screen" color={red} title="YAS — USSD">
        Numéro Togo (8 chiffres, commence par 90-93 ou 70-73). Composez{' '}
        <code className="bg-[#F3F4F6] px-1 rounded text-[0.65rem]">*145*1*{`{montant}`}*{`{adminYas}`}*2#</code>.
      </Row>
      <Row icon="fa-coins" color={red} title="TRX — portefeuille">
        Envoyez vers l&apos;adresse TRX de l&apos;admin et fournissez votre propre adresse
        en <code className="bg-[#F3F4F6] px-1 rounded text-[0.65rem]">T...</code>.
      </Row>

      <Callout icon="fa-user-shield" color="#F59E0B">
        <strong>Approbation admin requise</strong> pour les dépôts et retraits
        d&apos;investissement — fonds disponibles dans les <strong>6 heures</strong>. Le
        reste (compte principal, vidéo) suit le même système YAS / TRX.
      </Callout>

      <Callout icon="fa-shield-halved" color={red}>
        Ne communiquez <strong>jamais</strong> votre mot de passe ou code PIN.
      </Callout>
    </>
  );
}

function ReferralContent() {
  const pink = '#EC4899';
  return (
    <>
      <Row icon="fa-gift" color={pink} title="Votre code BR-XXXXXX">
        Votre code personnel est visible dans votre <strong>Profil</strong>. Partagez-le
        avec vos amis : ils doivent <strong>s&apos;inscrire</strong> avec pour être
        comptabilisés.
      </Row>
      <Row icon="fa-share-nodes" color={pink} title="Bouton « Invitez vos amis »">
        Dans votre profil, cliquez sur <strong>Invitez vos amis</strong> pour ouvrir la
        fenêtre de partage. Utilisez le bouton{' '}
        <strong>Copier le lien</strong> pour copier votre lien de parrainage, ou la{' '}
        <strong>partage native</strong> (WhatsApp, TikTok, Telegram…).
      </Row>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {['WhatsApp', 'TikTok', 'Instagram', 'Telegram', 'Facebook', 'SMS'].map((n) => (
          <span key={n} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FCE7F3] text-[#9D174D] text-[0.62rem] font-semibold">
            <i className="fas fa-check text-[0.5rem]" />
            {n}
          </span>
        ))}
      </div>

      <Row icon="fa-unlock" color="#F59E0B" title="Débloquer les niveaux">
        Niveau 2 = <strong>12 parrainés</strong>, Niveau 3 = <strong>25 parrainés</strong>.
      </Row>
      <Row icon="fa-calendar-xmark" color="#14B8A6" title="Débloquer les retraits vidéo">
        Après 3 jours, le retrait vidéo exige un investissement Niveau 1 actif ET des
        parrainés (le nombre augmente à chaque cycle de 3 jours).
      </Row>
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
