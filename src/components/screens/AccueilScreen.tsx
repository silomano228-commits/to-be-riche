'use client';

import { useState, useEffect } from 'react';
import { useAppStore, authFetch, formatCfa } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import NotificationBell from '@/components/NotificationBell';

/* ================================================================
   ACCUEIL — TABLEAU DE BORD DU JEUNE (premier onglet)
   ----------------------------------------------------------------
   Design conforme à la maquette fournie :
     • « Bonjour {prénom} — Toute ton activité aujourd'hui »
     • 4 cartes : Solde disponible · Gains aujourd'hui ·
       Missions réservées · File active
     • Objectif du mois : prêt de 5 000 FCFA (objectif à atteindre,
       conditions expliquées, caution = MOITIÉ de la somme empruntée)
     • PAS de section « Missions disponibles » ici : les missions
       se font via l'onglet « Mission » en bas de l'écran.
   ----------------------------------------------------------------
   DONNÉES FICTIVES (ÉTAPE 1) structurées comme les futures
   réponses API (GET /api/missions/dashboard, /api/missions/campaigns,
   /api/referral/list) pour un remplacement direct plus tard.
   ⚠️ Aucun système financier réel n'est branché à cette étape.
   ================================================================ */

interface AccueilStats {
  balanceCfa: number;          // Solde disponible (CAUTION NON INCLUSE)
  todayEarnedCfa: number;      // Gains du jour (missions validées)
  todayValidated: number;      // Images validées aujourd'hui
  reservedMissions: number;    // Missions réservées / prises aujourd'hui
  reservedMissionNames: string[];
  todaySubmissions: number;    // Soumissions du jour (file active)
  dailyLimit: number;          // Limite de soumissions/jour (10)
  missionGainsCfa: number;     // Gains TOTAUX issus des missions validées
  objectiveCfa: number;        // Seuil de solde pour débloquer le prêt (2 500 F)
  loanCfa: number;             // Montant du prêt visé (5 000 F)
  cautionRequiredCfa: number;  // Caution = MOITIÉ de la somme empruntée (2 500 F)
  cautionBalanceCfa: number;   // Caution déjà constituée
  referralCount: number;       // Parrainages validés
  referralRequired: number;    // Seuil de parrainages requis (5)
  accountVerified: boolean;    // Compte vérifié (OTP)
}

const MOCK_STATS: AccueilStats = {
  balanceCfa: 1850,
  todayEarnedCfa: 175,
  todayValidated: 7,
  reservedMissions: 2,
  reservedMissionNames: ['Mercedes', 'Immobilier'],
  todaySubmissions: 7,
  dailyLimit: 10,
  missionGainsCfa: 1850,
  objectiveCfa: 2500,
  loanCfa: 5000,
  cautionRequiredCfa: 2500,
  cautionBalanceCfa: 0,
  referralCount: 3,
  referralRequired: 5,
  accountVerified: true,
};

interface ActivityItem {
  id: string;
  when: string;
  label: string;
  detail?: string;
  amountCfa: number;
  ok: boolean;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 'a-1', when: "Aujourd'hui — 10:42", label: 'Image Mercedes validée', amountCfa: 25, ok: true },
  { id: 'a-2', when: "Aujourd'hui — 10:35", label: 'Image Mercedes refusée', detail: 'Image trop similaire', amountCfa: 0, ok: false },
  { id: 'a-3', when: 'Hier — 18:21', label: 'Image Immobilier validée', amountCfa: 25, ok: true },
];

export default function AccueilScreen() {
  const { user, setPage } = useAppStore();
  const [dailyNotif, setDailyNotif] = useState<{ message: string; referrals: number; required: number; code: string } | null>(null);

  /* Notification du jour — conservée depuis l'ancien accueil
     (une seule fois par session, API silencieuse en cas d'échec). */
  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const lastShown = typeof window !== 'undefined' ? localStorage.getItem('br_daily_notif_date') : '';
    if (lastShown === today) return;
    (async () => {
      try {
        const res = await authFetch('/api/notifications/daily');
        const data = await res.json();
        if (data.success && data.data) {
          setDailyNotif({ message: data.data.message, referrals: data.data.referralCount || 0, required: data.data.requiredReferrals || 10, code: data.data.referralCode || '' });
          localStorage.setItem('br_daily_notif_date', today);
        }
      } catch { /* silencieux */ }
    })();
  }, [user]);

  if (!user) return null;

  const firstName = (user.name || '').trim().split(/\s+/)[0] || (user.email || '').split('@')[0] || 'vous';
  const s = MOCK_STATS;
  const isAdmin = user.role === 'ADMIN' || user.role === 'admin';

  /* ===== Valeurs calculées (resteront exactes avec les vraies données) ===== */
  // La progression vers l'objectif se base sur le SOLDE DISPONIBLE alimenté
  // par les gains journaliers des missions validées (le user : « si la personne
  // gagne, elle fait les images et tout, elle fait un gain journalier, ça sera
  // ajouté là-bas »). Dépôts perso et caution restent distincts.
  const pctObjective = Math.min(100, Math.round((s.balanceCfa / s.objectiveCfa) * 100));
  const restObjective = Math.max(0, s.objectiveCfa - s.balanceCfa);
  const pctSubs = Math.min(100, Math.round((s.todaySubmissions / s.dailyLimit) * 100));
  const restSubs = Math.max(0, s.dailyLimit - s.todaySubmissions);
  const pctRef = Math.min(100, Math.round((s.referralCount / s.referralRequired) * 100));
  const restRef = Math.max(0, s.referralRequired - s.referralCount);
  const cautionReady = s.cautionBalanceCfa >= s.cautionRequiredCfa;
  const balanceOk = s.balanceCfa >= s.objectiveCfa;
  const referralsOk = s.referralCount >= s.referralRequired;
  const eligible = cautionReady && balanceOk && referralsOk && s.accountVerified;
  const missing: string[] = [];
  if (!balanceOk) missing.push(`${formatCfa(restObjective)} de solde`);
  if (!cautionReady) missing.push('la caution');
  if (!referralsOk) missing.push(`${restRef} parrainage${restRef > 1 ? 's' : ''}`);

  const cond = (ok: boolean, label: string, sub?: string) => (
    <div className="flex items-start gap-2 py-1">
      <i className={`fas ${ok ? 'fa-check-circle text-[#22C55E]' : 'fa-circle text-[#CBD5E1]'} text-[0.72rem] w-4 text-center shrink-0 mt-0.5`}></i>
      <div className="flex-1 min-w-0">
        <div className={`text-[0.68rem] font-semibold ${ok ? 'text-[#1F2937]' : 'text-[#64748B]'}`}>{label}</div>
        {sub && <div className="text-[0.56rem] text-[#94A3B8] leading-relaxed mt-0.5">{sub}</div>}
      </div>
    </div>
  );

  return (
    <>
      <Header title={<><LogoImg className="w-[26px] h-[26px] rounded-md" style={{ objectFit: 'contain' }} /> <span className="text-[#1F2937] font-black">Jeune Élan</span></>} rightElement={
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <button onClick={() => setPage('profile')} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem]"><i className="far fa-user-circle"></i></button>
        </div>
      } />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ===== Notification du jour (conservée de l'ancien accueil) ===== */}
        {dailyNotif && (
          <div className="mb-4 rounded-2xl p-3.5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
            <button onClick={() => setDailyNotif(null)} className="absolute top-2 right-3 bg-transparent border-none text-white/60 cursor-pointer text-[0.75rem]"><i className="fas fa-times"></i></button>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><i className="fas fa-bullhorn text-white text-[0.8rem]"></i></div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.6rem] text-white/70 font-bold uppercase tracking-[1px] mb-0.5">Notification du jour</div>
                <div className="text-[0.72rem] text-white font-semibold leading-snug mb-1.5">{dailyNotif.message}</div>
                <div className="flex items-center gap-3 text-[0.6rem] text-white/80">
                  <span><i className="fas fa-users mr-1"></i>{dailyNotif.referrals}/{dailyNotif.required} parrainés</span>
                  <span><i className="fas fa-key mr-1"></i>{dailyNotif.code}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Salutation ===== */}
        <div className="mb-4">
          <div className="text-[1.2rem] font-black text-[#1F2937]">Bonjour, {firstName} 👋</div>
          <div className="text-[0.72rem] text-[#64748B] mt-0.5">Toute ton activité aujourd&apos;hui.</div>
        </div>

        {/* ===== 4 cartes statistiques ===== */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* 1. SOLDE DISPONIBLE */}
          <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(34,197,94,0.1)]"><i className="fas fa-wallet text-[0.7rem] text-[#22C55E]"></i></div>
            <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">Solde disponible</div>
            <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{formatCfa(s.balanceCfa)}</div>
            <div className="text-[0.55rem] text-[#94A3B8] mt-1 leading-relaxed flex-1">Vos gains journaliers s&apos;y ajoutent à chaque image validée. Caution non incluse.</div>
            <button onClick={() => setPage('wallet')} className="mt-2.5 w-full py-1.5 rounded-lg bg-[rgba(34,197,94,0.08)] text-[#16A34A] text-[0.62rem] font-bold border border-[rgba(34,197,94,0.15)] cursor-pointer transition-transform active:scale-95">Voir mon portefeuille</button>
          </div>

          {/* 2. GAINS AUJOURD'HUI */}
          <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(245,158,11,0.1)]"><i className="fas fa-coins text-[0.7rem] text-[#F59E0B]"></i></div>
            <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">Gains aujourd&apos;hui</div>
            <div className="text-[1.05rem] font-black text-[#22C55E] mt-0.5">+{formatCfa(s.todayEarnedCfa)}</div>
            <div className="text-[0.55rem] text-[#94A3B8] mt-1 leading-relaxed flex-1">{s.todayValidated} image{s.todayValidated > 1 ? 's' : ''} validée{s.todayValidated > 1 ? 's' : ''} aujourd&apos;hui.</div>
          </div>

          {/* 3. MISSIONS RÉSERVÉES */}
          <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(168,85,247,0.1)]"><i className="fas fa-thumbtack text-[0.7rem] text-[#A855F7]"></i></div>
            <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">Missions réservées</div>
            <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{s.reservedMissions}</div>
            <div className="text-[0.55rem] text-[#94A3B8] mt-1 leading-relaxed flex-1 truncate">{s.reservedMissionNames.join(' · ')}</div>
            <button onClick={() => setPage('missions')} className="mt-2.5 w-full py-1.5 rounded-lg bg-[rgba(168,85,247,0.08)] text-[#7C3AED] text-[0.62rem] font-bold border border-[rgba(168,85,247,0.15)] cursor-pointer transition-transform active:scale-95">Voir les missions</button>
          </div>

          {/* 4. FILE ACTIVE */}
          <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(59,130,246,0.1)]"><i className="fas fa-layer-group text-[0.7rem] text-[#3B82F6]"></i></div>
            <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">File active</div>
            <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{s.todaySubmissions} / {s.dailyLimit}</div>
            <div className="w-full h-1.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden my-1.5">
              <div className="h-full bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] rounded-full transition-all duration-500" style={{ width: `${pctSubs}%` }} />
            </div>
            <div className="text-[0.55rem] text-[#94A3B8] mt-0.5 leading-relaxed flex-1">{restSubs} soumission{restSubs > 1 ? 's' : ''} restante{restSubs > 1 ? 's' : ''} aujourd&apos;hui (max {s.dailyLimit}/jour).</div>
          </div>
        </div>

        {/* ===== OBJECTIF DU MOIS : PRÊT DE 5 000 FCFA =====
             C'est un OBJECTIF à atteindre : pour obtenir ce prêt, il faut
             remplir certaines conditions — elles sont expliquées ici. */}
        <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(34,197,94,0.15)]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <i className="fas fa-bullseye text-[#22C55E] text-[0.8rem]"></i>
              <div className="text-[0.82rem] font-bold text-[#1F2937]">Objectif du mois</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(34,197,94,0.1)] text-[#22C55E]">Tâche à atteindre</span>
          </div>
          <div className="text-[0.72rem] font-semibold text-[#1F2937] mb-1">🎯 Obtenir un prêt de {formatCfa(s.loanCfa)}</div>
          <div className="text-[0.6rem] text-[#64748B] mb-3 leading-relaxed">C&apos;est un objectif à atteindre : remplissez les conditions ci-dessous pour débloquer votre demande de prêt. Chaque gain journalier (images validées) s&apos;ajoute à votre solde et vous rapproche de l&apos;objectif.</div>

          {/* Progression vers le seuil de solde */}
          <div className="flex justify-between items-end mb-1.5">
            <div className="text-[0.9rem] font-black text-[#1F2937]">{formatCfa(s.balanceCfa)} <span className="text-[#94A3B8] font-semibold text-[0.65rem]">/ {formatCfa(s.objectiveCfa)} de solde</span></div>
            <div className="text-[0.72rem] font-black text-[#22C55E]">{pctObjective} %</div>
          </div>
          <div className="w-full h-3 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${pctObjective}%` }} />
          </div>
          <div className="text-[0.6rem] text-[#64748B] mb-3">
            {balanceOk
              ? '🎉 Seuil de solde atteint !'
              : <>Il vous reste <strong className="text-[#1F2937]">{formatCfa(restObjective)}</strong> de gains pour atteindre le seuil.</>}
          </div>

          {/* Les conditions pour obtenir le prêt */}
          <div className="text-[0.65rem] font-black text-[#1F2937] uppercase tracking-wide mb-1.5">Les conditions</div>
          <div className="rounded-xl bg-[rgba(0,0,0,0.02)] p-2.5 mb-3">
            {cond(balanceOk, `Solde disponible — ${formatCfa(s.balanceCfa)} / ${formatCfa(s.objectiveCfa)}`, 'Alimenté par vos gains journaliers : chaque image validée ajoute son gain au solde.')}
            {cond(cautionReady, `Caution — ${formatCfa(s.cautionBalanceCfa)} / ${formatCfa(s.cautionRequiredCfa)}`, `Une garantie à verser : la MOITIÉ de la somme empruntée (${formatCfa(s.cautionRequiredCfa)} pour un prêt de ${formatCfa(s.loanCfa)}).`)}
            {cond(referralsOk, `Parrainages — ${s.referralCount} / ${s.referralRequired}`, 'Invitez vos amis avec votre code de parrainage.')}
            {cond(s.accountVerified, 'Compte vérifié', 'Votre adresse e-mail a été vérifiée par code OTP.')}
          </div>

          <div className={`rounded-xl p-2.5 mb-3 ${eligible ? 'bg-[rgba(34,197,94,0.1)]' : 'bg-[rgba(245,158,11,0.08)]'}`}>
            {eligible ? (
              <>
                <div className="text-[0.7rem] font-bold text-[#16A34A]">🟢 Conditions remplies</div>
                <div className="text-[0.6rem] text-[#64748B] mt-0.5 leading-relaxed">Vous pouvez maintenant soumettre votre demande de prêt.</div>
              </>
            ) : (
              <>
                <div className="text-[0.7rem] font-bold text-[#F59E0B]">Pas encore éligible</div>
                <div className="text-[0.6rem] text-[#64748B] mt-0.5 leading-relaxed">Il vous manque : {missing.join(', ')}.</div>
              </>
            )}
          </div>
          <button onClick={() => setPage('missions')} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-[0.75rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-[0.97]">
            {eligible ? 'Demander le prêt' : 'Voir les conditions détaillées'}
          </button>
        </div>

        {/* ===== MA CAUTION (visuellement distincte, hors solde) ===== */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-4 mb-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(245,158,11,0.15),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[rgba(245,158,11,0.15)] flex items-center justify-center"><i className="fas fa-lock text-[#FBBF24] text-[0.75rem]"></i></div>
                <div className="text-[0.82rem] font-bold">🔒 Ma caution</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[0.55rem] font-bold ${cautionReady ? 'bg-[rgba(34,197,94,0.2)] text-[#4ADE80]' : 'bg-[rgba(245,158,11,0.15)] text-[#FBBF24]'}`}>{cautionReady ? 'Constituée ✓' : 'À constituer'}</span>
            </div>
            <div className="text-[1.25rem] font-black mt-1">{formatCfa(s.cautionRequiredCfa)}</div>
            <div className="text-[0.62rem] text-[rgba(255,255,255,0.55)] mt-1 leading-relaxed">La moitié de votre prêt de {formatCfa(s.loanCfa)} : une garantie versée comme condition d&apos;accès au micro-prêt.</div>
            <div className="text-[0.6rem] text-[#FBBF24] mt-1.5 flex items-center gap-1.5"><i className="fas fa-shield-alt"></i> Sécurisée — non incluse dans votre solde, non disponible au retrait.</div>
          </div>
        </div>

        {/* ===== Comment ça marche ? (rappel compact) ===== */}
        <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="text-[0.82rem] font-bold text-[#1F2937] mb-3">Comment gagner ?</div>
          {[
            { n: 1, t: 'Choisissez une mission (onglet Mission en bas)', c: '#22C55E' },
            { n: 2, t: 'Créez votre image avec l\'IA de votre choix', c: '#3B82F6' },
            { n: 3, t: 'Importez votre image et soumettez-la', c: '#A855F7' },
            { n: 4, t: 'Le système la vérifie', c: '#F59E0B' },
            { n: 5, t: 'Si validée : jusqu\'à +30 FCFA ajoutés au solde', c: '#EF4444' },
          ].map((x, i, arr) => (
            <div key={x.n}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[0.6rem] shrink-0" style={{ background: x.c }}>{x.n}</div>
                <div className="text-[0.7rem] text-[#64748B] flex-1">{x.t}</div>
              </div>
              {i < arr.length - 1 && <div className="text-[#CBD5E1] text-[0.7rem] leading-none my-1 pl-2.5">↓</div>}
            </div>
          ))}
          <div className="text-[0.6rem] text-[#94A3B8] mt-3 italic leading-relaxed">Maximum 10 images par jour, missions pouvant payer jusqu&apos;à 30 FCFA par image. La génération se fait hors du site (ChatGPT, Gemini ou autre IA de votre choix).</div>
        </div>

        {/* ===== Activité récente ===== */}
        <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="text-[0.82rem] font-bold text-[#1F2937] mb-3">Activité récente</div>
          <div className="space-y-2.5">
            {MOCK_ACTIVITY.map(a => (
              <div key={a.id} className="flex items-start gap-2.5 pb-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: a.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  <i className={`fas ${a.ok ? 'fa-check-circle text-[#22C55E]' : 'fa-times-circle text-[#EF4444]'} text-[0.75rem]`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.55rem] text-[#94A3B8]">{a.when}</div>
                  <div className={`text-[0.7rem] font-semibold ${a.ok ? 'text-[#1F2937]' : 'text-[#64748B]'}`}>{a.label}</div>
                  {a.detail && <div className="text-[0.58rem] text-[#94A3B8] italic">{a.detail}</div>}
                </div>
                <div className={`text-[0.72rem] font-black shrink-0 ${a.ok ? 'text-[#22C55E]' : 'text-[#CBD5E1]'}`}>{a.amountCfa > 0 ? `+${a.amountCfa} F` : '0 F'}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setPage('missions')} className="w-full mt-3 py-2 rounded-xl bg-[rgba(0,0,0,0.03)] text-[#64748B] text-[0.68rem] font-semibold border border-[rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.97]">Voir tout l&apos;historique</button>
        </div>

        {/* ===== Accès rapides — conservés de l'ancien accueil ===== */}
        <div className="text-[0.82rem] font-black text-[#1F2937] mb-2">Accès rapides</div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: 'fa-dice', label: 'Jeu', page: 'game', color: '#F59E0B' },
            { icon: 'fa-building', label: 'Projets', page: 'enterprise', color: '#8B5CF6' },
            { icon: 'fa-gift', label: 'Parrainage', page: 'missions', color: '#A855F7' },
            { icon: 'fa-comment', label: 'Messages', page: 'chat', color: '#6366F1' },
            { icon: 'fa-compass', label: 'Guide', page: 'guide', color: '#14B8A6' },
            { icon: 'fa-chart-line', label: 'Investir', page: 'finance', color: '#3B82F6' },
            { icon: 'fa-arrow-down', label: 'Déposer', page: 'deposit-choose', color: '#22C55E' },
            ...(isAdmin ? [{ icon: 'fa-shield-alt', label: 'Admin', page: 'admin', color: '#EF4444' }] : []),
          ].map((a, i) => (
            <button key={i} onClick={() => setPage(a.page)} className="bg-white rounded-xl p-2.5 flex flex-col items-center gap-1 cursor-pointer border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-transform active:scale-95">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.color + '15' }}><i className={`fas ${a.icon} text-[0.7rem]`} style={{ color: a.color }}></i></div>
              <span className="text-[0.55rem] font-semibold text-[#64748B]">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
