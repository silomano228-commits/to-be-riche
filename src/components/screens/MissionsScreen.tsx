'use client';

import { useState } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { LogoImg } from '@/components/shared';

// ============================================================================
// TODO: Replace all fictive data below with real API calls when backend is ready
// ============================================================================

const FICTIVE = {
  // TODO: fetch from /api/missions/dashboard
  soldeDisponible: 1850,
  gainsAujourdhui: 175,
  imagesValideesAujourdhui: 7,
  imagesAujourdhui: 7,
  imagesLimitAujourdhui: 10,
  parrainagesValide: 3,
  parrainagesObjectif: 5,
  objectifFCFA: 2500,
  cautionFCFA: 5000,
  // TODO: fetch from /api/missions/eligibility
  eligibility: {
    gainsMinimum: { current: 1850, required: 2500, met: false },
    caution: { current: 0, required: 5000, met: false },
    parrainages: { current: 3, required: 5, met: false },
    compteVerifie: true,
  },
  // TODO: fetch from /api/missions/campaigns
  missions: [
    { id: 'mercedes', name: 'Mercedes', rewardPerImage: 25, submittedToday: 7, dailyLimit: 10, icon: 'fa-car', color: '#3B82F6' },
    { id: 'immobilier', name: 'Immobilier', brand: 'VillaPlus', rewardPerImage: 25, submittedToday: 2, dailyLimit: 10, icon: 'fa-home', color: '#22C55E' },
  ],
  // TODO: fetch from /api/missions/images?limit=5
  activiteRecente: [
    { id: '1', time: "Aujourd'hui — 10:42", label: 'Image Mercedes validée', amount: 25, status: 'validated' as const },
    { id: '2', time: "Aujourd'hui — 10:35", label: 'Image Mercedes refusée', detail: 'Image trop similaire', amount: 0, status: 'refused' as const },
    { id: '3', time: 'Hier — 18:21', label: 'Image Immobilier validée', amount: 25, status: 'validated' as const },
  ],
  // TODO: fetch notification count from /api/notifications
  notifCount: 3,
};

const TABS = [
  { key: 'tableau', label: 'Tableau' },
  { key: 'missions', label: 'Missions' },
  { key: 'mesimages', label: 'Mes images' },
  { key: 'portefeuille', label: 'Portefeuille' },
  { key: 'prets', label: 'Prêts' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ============================================================================
// Sub-components
// ============================================================================

function ProgressBar({ value, max, gradient }: { value: number; max: number; gradient: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: gradient }}
      />
    </div>
  );
}

function BigProgressBar({ value, max, gradient }: { value: number; max: number; gradient: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-4 bg-[#F1F5F9] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: gradient }}
      />
    </div>
  );
}

function StatCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4 ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Tab: Tableau (main dashboard)
// ============================================================================

function TableauTab() {
  const { user, setPage } = useAppStore();
  const firstName = user?.name?.split(' ')[0] || 'Utilisateur';
  const d = FICTIVE;
  const remainingImages = d.imagesLimitAujourdhui - d.imagesAujourdhui;
  const remainingParrainages = d.parrainagesObjectif - d.parrainagesValide;
  const remainingObjectif = d.objectifFCFA - d.soldeDisponible;
  const objectifPct = Math.round((d.soldeDisponible / d.objectifFCFA) * 100);
  const e = d.eligibility;
  const allMet = e.gainsMinimum.met && e.caution.met && e.parrainages.met && e.compteVerifie;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* 1. Welcome */}
      <div>
        <h2 className="text-xl font-extrabold text-[#1F2937] leading-tight">
          Bonjour, {firstName} 👋
        </h2>
        <p className="text-[0.82rem] text-[#64748B] mt-1">
          Voici l&apos;état de votre activité aujourd&apos;hui.
        </p>
      </div>

      {/* 2. 4 Stat cards — 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Solde disponible */}
        <StatCard>
          <div className="text-[0.68rem] font-semibold text-[#64748B] uppercase tracking-wide">Solde disponible</div>
          <div className="text-xl font-extrabold text-[#1F2937] mt-1">{d.soldeDisponible.toLocaleString('fr-FR')} F</div>
          <p className="text-[0.68rem] text-[#94A3B8] mt-1.5 leading-snug">Montant disponible selon les règles du programme.</p>
          <button onClick={() => setPage('missions')} className="text-[0.7rem] font-semibold text-[#22C55E] mt-2 bg-transparent border-none cursor-pointer p-0 hover:underline">
            Voir mon portefeuille →
          </button>
        </StatCard>

        {/* Gains aujourd'hui */}
        <StatCard>
          <div className="text-[0.68rem] font-semibold text-[#64748B] uppercase tracking-wide">Gains aujourd&apos;hui</div>
          <div className="text-xl font-extrabold text-[#22C55E] mt-1">+{d.gainsAujourdhui.toLocaleString('fr-FR')} F</div>
          <p className="text-[0.68rem] text-[#94A3B8] mt-1.5 leading-snug">{d.imagesValideesAujourdhui} images validées</p>
        </StatCard>

        {/* Images aujourd'hui */}
        <StatCard>
          <div className="text-[0.68rem] font-semibold text-[#64748B] uppercase tracking-wide">Images aujourd&apos;hui</div>
          <div className="text-lg font-extrabold text-[#1F2937] mt-1">
            {d.imagesAujourdhui} / {d.imagesLimitAujourdhui}
          </div>
          <div className="mt-2">
            <ProgressBar value={d.imagesAujourdhui} max={d.imagesLimitAujourdhui} gradient="linear-gradient(90deg, #22C55E 0%, #16A34A 100%)" />
          </div>
          <p className="text-[0.68rem] text-[#94A3B8] mt-1.5 leading-snug">
            Il vous reste {remainingImages} soumissions aujourd&apos;hui.
          </p>
        </StatCard>

        {/* Parrainages validés */}
        <StatCard>
          <div className="text-[0.68rem] font-semibold text-[#64748B] uppercase tracking-wide">Parrainages validés</div>
          <div className="text-lg font-extrabold text-[#1F2937] mt-1">
            {d.parrainagesValide} / {d.parrainagesObjectif}
          </div>
          <div className="mt-2">
            <ProgressBar value={d.parrainagesValide} max={d.parrainagesObjectif} gradient="linear-gradient(90deg, #A855F7 0%, #7C3AED 100%)" />
          </div>
          <p className="text-[0.68rem] text-[#94A3B8] mt-1.5 leading-snug">
            Encore {remainingParrainages} pour le prêt 5 000 F.
          </p>
          <button onClick={() => setPage('missions')} className="text-[0.7rem] font-semibold text-[#A855F7] mt-1 bg-transparent border-none cursor-pointer p-0 hover:underline">
            Voir mon parrainage →
          </button>
        </StatCard>
      </div>

      {/* 3 + 4. Progression + Éligibilité — side by side on wider, stacked on mobile */}
      <div className="flex flex-col gap-4">
        {/* 3. Progression vers 2 500 FCFA */}
        <StatCard>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center">
              <i className="fas fa-bullseye text-[#22C55E] text-sm" />
            </div>
            <div>
              <h3 className="text-[0.92rem] font-extrabold text-[#1F2937]">Objectif : {d.objectifFCFA.toLocaleString('fr-FR')} FCFA</h3>
            </div>
          </div>
          <p className="text-[0.75rem] text-[#64748B] leading-snug mb-3">
            Accumulez au moins {d.objectifFCFA.toLocaleString('fr-FR')} FCFA grâce aux missions validées pour débloquer cette étape.
          </p>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-bold text-[#1F2937]">{d.soldeDisponible.toLocaleString('fr-FR')} / {d.objectifFCFA.toLocaleString('fr-FR')} FCFA</span>
            <span className="text-xs font-bold text-[#22C55E]">{objectifPct}%</span>
          </div>
          <BigProgressBar value={d.soldeDisponible} max={d.objectifFCFA} gradient="linear-gradient(90deg, #22C55E 0%, #16A34A 100%)" />
          <p className="text-[0.75rem] text-[#64748B] mt-2 leading-snug">
            Il vous reste <strong className="text-[#1F2937]">{remainingObjectif.toLocaleString('fr-FR')} FCFA</strong> pour atteindre cet objectif.
          </p>
        </StatCard>

        {/* 4. Mon éligibilité */}
        <StatCard>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[rgba(168,85,247,0.12)] flex items-center justify-center">
              <i className="fas fa-shield-alt text-[#A855F7] text-sm" />
            </div>
            <div>
              <h3 className="text-[0.92rem] font-extrabold text-[#1F2937]">Mon éligibilité</h3>
              <p className="text-[0.7rem] text-[#64748B]">Prêt de 5 000 FCFA</p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {/* Gains minimum */}
            <div className="flex items-center gap-2.5">
              {e.gainsMinimum.met ? (
                <span className="text-[#22C55E] text-sm font-bold">✓</span>
              ) : (
                <span className="text-[#EF4444] text-sm font-bold">✕</span>
              )}
              <span className="text-[0.78rem] text-[#1F2937]">Gains minimum : {e.gainsMinimum.current.toLocaleString('fr-FR')} / {e.gainsMinimum.required.toLocaleString('fr-FR')} F</span>
            </div>
            {/* Caution */}
            <div className="flex items-center gap-2.5">
              {e.caution.met ? (
                <span className="text-[#22C55E] text-sm font-bold">✓</span>
              ) : (
                <span className="text-[#EF4444] text-sm font-bold">✕</span>
              )}
              <span className="text-[0.78rem] text-[#1F2937]">Caution : {e.caution.current.toLocaleString('fr-FR')} / {e.caution.required.toLocaleString('fr-FR')} F</span>
            </div>
            {/* Parrainages */}
            <div className="flex items-center gap-2.5">
              {e.parrainages.met ? (
                <span className="text-[#22C55E] text-sm font-bold">✓</span>
              ) : (
                <span className="text-[#EF4444] text-sm font-bold">✕</span>
              )}
              <span className="text-[0.78rem] text-[#1F2937]">Parrainages : {e.parrainages.current} / {e.parrainages.required}</span>
            </div>
            {/* Compte vérifié */}
            <div className="flex items-center gap-2.5">
              {e.compteVerifie ? (
                <span className="text-[#22C55E] text-sm font-bold">✓</span>
              ) : (
                <span className="text-[#EF4444] text-sm font-bold">✕</span>
              )}
              <span className="text-[0.78rem] text-[#1F2937]">Compte vérifié</span>
            </div>
          </div>

          {!allMet && (
            <div className="mt-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl p-3">
              <p className="text-[0.78rem] font-bold text-[#B45309]">Pas encore éligible</p>
              <p className="text-[0.7rem] text-[#92400E] mt-0.5 leading-snug">
                Vous devez remplir toutes les conditions ci-dessus pour être éligible au prêt de 5 000 FCFA.
              </p>
            </div>
          )}

          <button className="mt-3 w-full py-2.5 rounded-xl text-[0.82rem] font-semibold bg-[#A855F7] text-white border-none cursor-pointer transition-transform active:scale-[0.97] hover:bg-[#7C3AED]">
            Voir les conditions
          </button>
        </StatCard>
      </div>

      {/* 5. Ma caution */}
      <StatCard>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.12)] flex items-center justify-center">
            <span className="text-lg">🔒</span>
          </div>
          <div className="flex-1">
            <h3 className="text-[0.92rem] font-extrabold text-[#1F2937]">Ma caution</h3>
            <p className="text-lg font-extrabold text-[#F59E0B]">{d.cautionFCFA.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>
        <p className="text-[0.75rem] text-[#64748B] mt-2 leading-snug">
          Montant réservé comme caution selon les conditions du programme.
        </p>
        <p className="text-[0.75rem] font-bold text-[#B45309] mt-1 leading-snug">
          Ce montant n&apos;est pas inclus dans votre solde disponible.
        </p>
      </StatCard>

      {/* 6. Missions disponibles */}
      <div>
        <h3 className="text-[0.95rem] font-extrabold text-[#1F2937] mb-3">Missions disponibles</h3>
        <div className="flex flex-col gap-3">
          {d.missions.map((m) => (
            <StatCard key={m.id}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}15` }}>
                  <i className={`fas ${m.icon} text-sm`} style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[0.88rem] font-bold text-[#1F2937]">{m.name}</h4>
                  <p className="text-[0.75rem] text-[#22C55E] font-semibold">{m.rewardPerImage} FCFA / image</p>
                </div>
                <div className="text-right">
                  <span className="text-[0.75rem] font-semibold text-[#64748B]">{m.submittedToday}/{m.dailyLimit}</span>
                  <p className="text-[0.65rem] text-[#94A3B8]">aujourd&apos;hui</p>
                </div>
              </div>
              <button className="mt-3 w-full py-2.5 rounded-xl text-[0.82rem] font-semibold bg-[#22C55E] text-white border-none cursor-pointer transition-transform active:scale-[0.97] hover:bg-[#16A34A]">
                Voir la mission
              </button>
            </StatCard>
          ))}
        </div>
      </div>

      {/* 7. Comment ça marche ? */}
      <StatCard>
        <h3 className="text-[0.95rem] font-extrabold text-[#1F2937] mb-3">Comment ça marche ?</h3>
        <div className="flex flex-col gap-3">
          {[
            { step: 1, text: 'Choisissez une mission', icon: 'fa-bullhorn', color: '#22C55E' },
            { step: 2, text: 'Créez votre image avec une IA externe', icon: 'fa-robot', color: '#3B82F6' },
            { step: 3, text: 'Importez votre image ici', icon: 'fa-upload', color: '#A855F7' },
            { step: 4, text: 'Notre système vérifie l\'image', icon: 'fa-search', color: '#F59E0B' },
            { step: 5, text: 'Si elle est validée : +25 FCFA', icon: 'fa-check-circle', color: '#22C55E' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                <i className={`fas ${s.icon} text-[0.65rem]`} style={{ color: s.color }} />
              </div>
              <div className="flex-1">
                <span className="text-[0.72rem] font-bold text-[#94A3B8]">Étape {s.step}</span>
                <p className="text-[0.78rem] text-[#1F2937] font-medium leading-snug">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </StatCard>

      {/* 8. Activité récente */}
      <div>
        <h3 className="text-[0.95rem] font-extrabold text-[#1F2937] mb-3">Activité récente</h3>
        <StatCard className="!p-0 overflow-hidden">
          <div className="divide-y divide-[rgba(0,0,0,0.06)]">
            {d.activiteRecente.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.status === 'validated' ? 'bg-[rgba(34,197,94,0.12)]' : 'bg-[rgba(239,68,68,0.12)]'}`}>
                  <i className={`fas ${a.status === 'validated' ? 'fa-check' : 'fa-times'} text-xs ${a.status === 'validated' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.78rem] font-semibold text-[#1F2937] leading-tight">{a.label}</p>
                  {a.detail && (
                    <p className="text-[0.68rem] text-[#94A3B8] leading-snug mt-0.5">{a.detail}</p>
                  )}
                  <p className="text-[0.65rem] text-[#94A3B8] mt-0.5">{a.time}</p>
                </div>
                <span className={`text-[0.78rem] font-bold shrink-0 ${a.amount > 0 ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}>
                  {a.amount > 0 ? `+${a.amount} FCFA` : '0 FCFA'}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)]">
            <button className="w-full py-2 rounded-xl text-[0.82rem] font-semibold bg-[rgba(0,0,0,0.04)] text-[#64748B] border-none cursor-pointer hover:bg-[rgba(0,0,0,0.08)] transition-colors">
              Voir tout l&apos;historique
            </button>
          </div>
        </StatCard>
      </div>
    </div>
  );
}

// ============================================================================
// Placeholder tabs
// ============================================================================

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-[rgba(34,197,94,0.08)] flex items-center justify-center">
        <i className="fas fa-clock text-[#94A3B8] text-xl" />
      </div>
      <h3 className="text-[0.95rem] font-bold text-[#1F2937]">{title}</h3>
      <p className="text-[0.82rem] text-[#64748B] text-center max-w-[260px] leading-snug">
        Cette section sera disponible prochainement.
      </p>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function MissionsScreen() {
  const { user, setPage } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('tableau');
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
      {/* ======== HEADER ======== */}
      <header className="h-[58px] bg-white/90 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-30 shrink-0 border-b border-[rgba(0,0,0,0.04)]">
        {/* Left: Logo + Name */}
        <div className="flex items-center gap-2.5">
          <LogoImg className="w-8 h-8 rounded-[10px]" />
          <span className="text-[1rem] font-black text-[#1F2937]">Jeune Élan</span>
        </div>

        {/* Right: Notif bell + Profile */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={() => setPage('home')}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 relative"
          >
            <i className="fas fa-bell" />
            {FICTIVE.notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#EF4444] text-white text-[0.55rem] font-bold rounded-full flex items-center justify-center">
                {FICTIVE.notifCount}
              </span>
            )}
          </button>

          {/* Profile dropdown button */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90"
            >
              <i className="fas fa-user-circle" />
            </button>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-[40]" onClick={() => setShowProfile(false)} />
                <div
                  className="absolute right-0 top-12 w-[200px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] z-[50] overflow-hidden"
                  style={{ animation: 'modalIn 0.15s ease-out' }}
                >
                  <div className="p-3 border-b border-[rgba(0,0,0,0.06)]">
                    <p className="text-[0.78rem] font-bold text-[#1F2937] truncate">{user?.name || 'Utilisateur'}</p>
                    <p className="text-[0.65rem] text-[#94A3B8] truncate">{user?.email || ''}</p>
                  </div>
                  <div className="p-1.5">
                    <button onClick={() => { setPage('profile'); setShowProfile(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[0.78rem] text-[#1F2937] bg-transparent border-none cursor-pointer hover:bg-[rgba(0,0,0,0.04)] transition-colors flex items-center gap-2.5">
                      <i className="fas fa-user text-[0.7rem] text-[#64748B]" /> Mon profil
                    </button>
                    <button onClick={() => { setPage('home'); setShowProfile(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[0.78rem] text-[#1F2937] bg-transparent border-none cursor-pointer hover:bg-[rgba(0,0,0,0.04)] transition-colors flex items-center gap-2.5">
                      <i className="fas fa-cog text-[0.7rem] text-[#64748B]" /> Paramètres
                    </button>
                    <button onClick={() => { setPage('auth'); setShowProfile(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[0.78rem] text-[#EF4444] bg-transparent border-none cursor-pointer hover:bg-[rgba(239,68,68,0.06)] transition-colors flex items-center gap-2.5 mt-1">
                      <i className="fas fa-sign-out-alt text-[0.7rem]" /> Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ======== SUB-NAVIGATION TABS ======== */}
      <div className="bg-white border-b border-[rgba(0,0,0,0.06)] sticky top-[58px] z-20">
        <div className="flex overflow-x-auto px-2 gap-0.5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-[0.8rem] font-semibold whitespace-nowrap border-none cursor-pointer transition-colors relative bg-transparent
                ${activeTab === t.key ? 'text-[#22C55E]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full bg-[#22C55E]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ======== CONTENT ======== */}
      <main className="flex-1 px-4 pt-4 pb-6">
        {activeTab === 'tableau' && <TableauTab />}
        {activeTab === 'missions' && <PlaceholderTab title="Missions" />}
        {activeTab === 'mesimages' && <PlaceholderTab title="Mes images" />}
        {activeTab === 'portefeuille' && <PlaceholderTab title="Portefeuille" />}
        {activeTab === 'prets' && <PlaceholderTab title="Prêts" />}
      </main>
    </div>
  );
}
