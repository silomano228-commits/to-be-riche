'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, authFetch, refreshUser, formatCfa } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import NotificationBell from '@/components/NotificationBell';

interface Campaign {
  id: string; name: string; brand: string; description: string; brief: string;
  format: string; style: string; constraints: string; rewardCfa: number;
  dailyLimit: number; maxImages: number; totalImages: number; totalValidated: number;
  category: string; userDailyCount: number;
}

interface MissionImage {
  id: string; status: string; campaignId: string; aiScore: number;
  similarityScore: number; submittedDate: string; createdAt: string;
  campaign?: { name: string; brand: string };
  aiAnalysis?: string; adminNote?: string;
}

interface DashboardData {
  missionBalance: number; missionBalanceCfa: number; missionTotalEarnedCfa: number;
  validatedToday: number; todaySubmissions: number; dailyLimit: number;
  rewardPerImage: number; objectiveCfa: number; cautionBalanceCfa: number;
  cautionStatus: string; cautionAmountCfa: number; validatedReferralCount: number;
  referralCount: number; activeCampaigns: number; activeLoans: number;
  pendingLoans: number; userLevel: number;
}

const ST: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'En attente', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'fa-clock' },
  validated: { label: 'Validée ✓', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'fa-check-circle' },
  refused: { label: 'Refusée', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: 'fa-times-circle' },
  non_compliant: { label: 'Non conforme', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: 'fa-exclamation-circle' },
  to_correct: { label: 'À corriger', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'fa-edit' },
  duplicate: { label: 'Doublon', color: '#A855F7', bg: 'rgba(168,85,247,0.12)', icon: 'fa-copy' },
};

const LOAN_ST: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#F59E0B' },
  approved: { label: 'Approuvé', color: '#3B82F6' },
  active: { label: 'Actif', color: '#22C55E' },
  repaying: { label: 'Remboursement', color: '#22C55E' },
  overdue: { label: 'En retard', color: '#EF4444' },
  completed: { label: 'Remboursé', color: '#22C55E' },
  rejected: { label: 'Refusé', color: '#EF4444' },
};

const CAT_ICON: Record<string, { icon: string; color: string }> = {
  immobilier: { icon: 'fa-home', color: '#22C55E' },
  automobile: { icon: 'fa-car', color: '#3B82F6' },
  mode: { icon: 'fa-gem', color: '#A855F7' },
  tech: { icon: 'fa-microchip', color: '#06B6D4' },
  food: { icon: 'fa-utensils', color: '#F59E0B' },
  travel: { icon: 'fa-plane', color: '#EF4444' },
  general: { icon: 'fa-star', color: '#64748B' },
};

/* ================================================================
   ÉTAPE 1 — DONNÉES FICTIVES (visualisation du design uniquement)
   ----------------------------------------------------------------
   Ces constantes servent uniquement à visualiser le tableau de bord.
   Plus tard, elles seront remplacées par les vraies données :
     • GET /api/missions/dashboard → stats (solde, gains, images…)
     • GET /api/missions/campaigns → missions disponibles
     • GET /api/referral/list      → filleuls + code de parrainage
   Les interfaces ci-dessous reprennent la forme des réponses API
   afin que le remplacement soit direct, sans refonte de l'UI.
   ⚠️ Aucun système financier réel n'est branché à cette étape.
   ================================================================ */

type TabId = 'dashboard' | 'campaigns' | 'myimages' | 'eligibility' | 'loans' | 'referral';

interface DashboardStats {
  balanceCfa: number;         // Solde disponible (CAUTION NON INCLUSE)
  todayEarnedCfa: number;     // Gains du jour (missions)
  todayValidated: number;     // Images validées aujourd'hui
  todaySubmissions: number;   // Soumissions utilisées aujourd'hui
  dailyLimit: number;         // Limite de soumissions/jour (10)
  missionGainsCfa: number;    // Gains TOTAUX issus des missions validées
  objectiveCfa: number;       // Objectif de gains (2 500 F)
  cautionRequiredCfa: number; // Caution requise (5 000 F)
  cautionBalanceCfa: number;  // Caution déjà constituée
  referralCount: number;      // Parrainages validés
  referralRequired: number;   // Seuil de parrainages requis (5)
  accountVerified: boolean;   // Compte vérifié (OTP)
}

const MOCK_STATS: DashboardStats = {
  balanceCfa: 1850,
  todayEarnedCfa: 175,
  todayValidated: 7,
  todaySubmissions: 7,
  dailyLimit: 10,
  missionGainsCfa: 1850,
  objectiveCfa: 2500,
  cautionRequiredCfa: 5000,
  cautionBalanceCfa: 0,
  referralCount: 3,
  referralRequired: 5,
  accountVerified: true,
};

interface MissionCardData {
  id: string;
  name: string;
  category: string;        // clé CAT_ICON (automobile, immobilier…)
  rewardCfa: number;       // gain par image validée
  userDailyCount: number;  // soumissions perso aujourd'hui
  dailyLimit: number;      // limite quotidienne
}

const MOCK_MISSIONS: MissionCardData[] = [
  { id: 'm-mercedes', name: 'Mercedes', category: 'automobile', rewardCfa: 25, userDailyCount: 7, dailyLimit: 10 },
  { id: 'm-immobilier', name: 'Immobilier', category: 'immobilier', rewardCfa: 25, userDailyCount: 2, dailyLimit: 10 },
];

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

interface ReferralData {
  code: string;
  required: number;
  referrals: { id: string; name: string; date: string; validated: boolean }[];
}

const MOCK_REFERRALS: ReferralData = {
  code: 'JEA-7K2M9',
  required: 5,
  referrals: [
    { id: 'r-1', name: 'Aminata D.', date: '18 sept. 2026', validated: true },
    { id: 'r-2', name: 'Kossi A.', date: '15 sept. 2026', validated: true },
    { id: 'r-3', name: 'Fatou B.', date: '12 sept. 2026', validated: true },
  ],
};
/* ================ FIN DES DONNÉES FICTIVES ================ */

export default function MissionsScreen() {
  const { user, setPage, addToast } = useAppStore();
  const [tab, setTab] = useState<TabId>('dashboard');
  const [dash, setDash] = useState<DashboardData|null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [images, setImages] = useState<MissionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selCamp, setSelCamp] = useState<Campaign|null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [elig, setElig] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dr, cr, ir] = await Promise.all([
        authFetch('/api/missions/dashboard'),
        authFetch('/api/missions/campaigns'),
        authFetch('/api/missions/images?limit=20'),
      ]);
      const dd = await dr.json(); if (dd.success) setDash(dd.dashboard);
      const cd = await cr.json(); if (cd.success) setCampaigns(cd.campaigns);
      const id2 = await ir.json(); if (id2.success) setImages(id2.images);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const loadElig = async () => {
    try { const r = await authFetch('/api/missions/eligibility'); const d = await r.json(); if (d.success) setElig({ ...d.eligibility, userLevel: d.userLevel, userLevelLabel: d.userLevelLabel, activeLoan: d.activeLoan }); } catch {}
  };

  const loadLoans = async () => {
    try { const r = await authFetch('/api/missions/loans'); const d = await r.json(); if (d.success) setLoans(d.loans); } catch {}
  };

  const handleUpload = async (file: File) => {
    if (!selCamp) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = (e.target?.result as string).split(',')[1];
      try {
        const r = await authFetch('/api/missions/images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: selCamp.id, imageData: b64 }) });
        const d = await r.json();
        if (d.success) { addToast('Image envoyée ! Validation IA en cours...', 'success'); setShowUpload(false); setSelCamp(null); setTimeout(loadData, 3000); }
        else addToast(d.error || 'Erreur', 'error');
      } catch { addToast('Erreur d\'envoi', 'error'); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const reqLoan = async (amt: number) => {
    try {
      const r = await authFetch('/api/missions/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountCfa: amt }) });
      const d = await r.json();
      if (d.success) { addToast(`Demande de ${formatCfa(amt)} enregistrée !`, 'success'); loadLoans(); loadElig(); }
      else addToast(d.error || 'Conditions non remplies', 'error');
    } catch { addToast('Erreur', 'error'); }
  };

  const depositCaution = async () => {
    try {
      const r = await authFetch('/api/missions/caution', { method: 'POST' });
      const d = await r.json();
      if (d.success) { addToast('Caution constituée !', 'success'); loadData(); }
      else addToast(d.error || 'Erreur', 'error');
    } catch { addToast('Erreur', 'error'); }
  };

  const repay = async (lid: string) => {
    const s = prompt('Montant à rembourser (FCFA) :');
    if (!s) return;
    const amt = parseInt(s);
    if (isNaN(amt) || amt <= 0) { addToast('Montant invalide', 'error'); return; }
    try {
      const r = await authFetch(`/api/missions/loans/${lid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'repay', amountCfa: amt }) });
      const d = await r.json();
      if (d.success) { addToast('Remboursement effectué !', 'success'); loadLoans(); loadData(); refreshUser(); }
      else addToast(d.error || 'Erreur', 'error');
    } catch { addToast('Erreur', 'error'); }
  };

  if (!user) return null;

  // Menu principal du tableau de bord (spec §4)
  // « Portefeuille » est un raccourci vers l'écran portefeuille (nav),
  // les autres entrées restent des sous-onglets locaux.
  const tabs: { id: string; icon: string; label: string; nav?: string }[] = [
    { id: 'dashboard', icon: 'fa-th-large', label: 'Tableau' },
    { id: 'campaigns', icon: 'fa-bullhorn', label: 'Missions' },
    { id: 'myimages', icon: 'fa-images', label: 'Mes images' },
    { id: 'wallet', icon: 'fa-wallet', label: 'Portefeuille', nav: 'wallet' },
    { id: 'eligibility', icon: 'fa-chart-bar', label: 'Éligibilité' },
    { id: 'loans', icon: 'fa-hand-holding-usd', label: 'Mes prêts' },
    { id: 'referral', icon: 'fa-users', label: 'Parrainage' },
  ];

  const firstName = (user.name || '').trim().split(/\s+/)[0] || (user.email || '').split('@')[0] || 'vous';

  return (
    <>
      <Header title={<><LogoImg className="w-[26px] h-[26px] rounded-md" style={{ objectFit: 'contain' }} /> <span className="text-[#1F2937] font-black">Jeune Élan</span></>} rightElement={
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <button onClick={() => setPage('profile')} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem]"><i className="far fa-user-circle"></i></button>
        </div>
      } />
      <div className="flex gap-1 px-4 pt-2 pb-1 overflow-x-auto bg-white border-b border-[rgba(0,0,0,0.05)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { if (t.nav) { setPage(t.nav); return; } setTab(t.id as TabId); if (t.id === 'eligibility') loadElig(); if (t.id === 'loans') loadLoans(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all whitespace-nowrap ${tab === t.id ? 'bg-[#22C55E] text-white' : 'bg-[rgba(0,0,0,0.03)] text-[#64748B]'}`}>
            <i className={`fas ${t.icon} text-[0.65rem]`}></i> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Le tableau de bord s'affiche immédiatement (données fictives ÉTAPE 1).
            Les autres onglets continuent d'utiliser les vraies APIs. */}
        {tab === 'dashboard' ? <DashV firstName={firstName} setPage={setPage} go={setTab} />
        : loading && !dash ? <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div>
        : tab === 'campaigns' ? <CampV camps={campaigns} onSel={c => { setSelCamp(c); setShowUpload(true); }} />
        : tab === 'myimages' ? <ImgV imgs={images} />
        : tab === 'eligibility' ? <EligV elig={elig} onLoan={reqLoan} onCaution={depositCaution} dash={dash} onLoad={loadElig} />
        : tab === 'loans' ? <LoanV loans={loans} onRepay={repay} />
        : tab === 'referral' ? <ParrainV code={user.referralCode || MOCK_REFERRALS.code} required={MOCK_REFERRALS.required} referrals={MOCK_REFERRALS.referrals} />
        : null}
      </div>

      {/* Upload modal — primary way to submit images */}
      {showUpload && selCamp && (
        <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] flex items-end justify-center" onClick={() => setShowUpload(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#1F2937]">Poster une image</h3>
              <button onClick={() => setShowUpload(false)} className="text-[#94A3B8] text-xl cursor-pointer border-none bg-transparent"><i className="fas fa-times"></i></button>
            </div>

            {/* Campaign info */}
            <div className="mb-4 p-3.5 bg-[rgba(34,197,94,0.06)] rounded-xl border border-[rgba(34,197,94,0.12)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: (CAT_ICON[selCamp.category] || CAT_ICON.general).color + '15' }}>
                  <i className={`fas ${(CAT_ICON[selCamp.category] || CAT_ICON.general).icon} text-[0.75rem]`} style={{ color: (CAT_ICON[selCamp.category] || CAT_ICON.general).color }}></i>
                </div>
                <div>
                  <div className="text-[0.78rem] font-bold text-[#1F2937]">{selCamp.brand}</div>
                  <div className="text-[0.65rem] text-[#64748B]">{selCamp.name}</div>
                </div>
              </div>
              <div className="text-[0.65rem] text-[#64748B] leading-relaxed">{selCamp.brief}</div>
              {selCamp.constraints && <div className="text-[0.6rem] text-[#94A3B8] mt-1.5 italic">📌 {selCamp.constraints}</div>}
            </div>

            {/* Instructions - CRITICAL: explain external creation */}
            <div className="mb-4 p-3.5 bg-[rgba(59,130,246,0.06)] rounded-xl border border-[rgba(59,130,246,0.12)]">
              <div className="text-[0.72rem] font-bold text-[#3B82F6] mb-2"><i className="fas fa-info-circle mr-1"></i> Comment ça marche ?</div>
              <ol className="text-[0.65rem] text-[#1E40AF] space-y-1.5 list-decimal ml-3.5">
                <li>Ouvrez <strong>ChatGPT, DALL-E, Midjourney</strong> ou toute autre IA</li>
                <li>Générez une image en suivant le brief ci-dessus</li>
                <li>Téléchargez l&apos;image sur votre appareil</li>
                <li>Uploadez-la ici en cliquant le bouton ci-dessous</li>
              </ol>
            </div>

            {/* Upload button */}
            <label className="w-full py-4 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-[0.88rem] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(34,197,94,0.25)] transition-transform active:scale-[0.97] mb-3">
              {uploading ? (
                <><div className="w-4 h-4 border-[2px] border-white/30 border-t-white rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /> Envoi en cours...</>
              ) : (
                <><i className="fas fa-cloud-upload-alt text-[1rem]"></i> Uploader mon image</>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={uploading} />
            </label>

            {/* Reward info */}
            <div className="flex items-center justify-center gap-4 text-[0.65rem] text-[#94A3B8]">
              <span><i className="fas fa-coins text-[#F59E0B] mr-1"></i> +{selCamp.rewardCfa} FCFA/image validée</span>
              <span><i className="fas fa-clock mr-1"></i> Max {selCamp.dailyLimit}/jour</span>
              <span><i className="fas fa-expand mr-1"></i> Format {selCamp.format}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   DASHBOARD VIEW — ÉTAPE 1 : TABLEAU DE BORD DU JEUNE
   Design conforme à la spec (§5 à §18). Données fictives
   (MOCK_*) structurées comme les futures réponses API.
   ============================================================ */
function DashV({ firstName, setPage, go }: { firstName: string; setPage: (p: string) => void; go: (t: TabId) => void }) {
  const s = MOCK_STATS;

  /* Valeurs calculées — resteront exactes quand les vraies données
     remplaceront les données fictives. IMPORTANT (spec §11) : la
     progression vers 2 500 F se base sur les gains issus des missions
     validées, PAS sur le solde (dépôts, caution et prêts exclus). */
  const pctObjective = Math.min(100, Math.round((s.missionGainsCfa / s.objectiveCfa) * 100));
  const restObjective = Math.max(0, s.objectiveCfa - s.missionGainsCfa);
  const pctSubs = Math.min(100, Math.round((s.todaySubmissions / s.dailyLimit) * 100));
  const restSubs = Math.max(0, s.dailyLimit - s.todaySubmissions);
  const pctRef = Math.min(100, Math.round((s.referralCount / s.referralRequired) * 100));
  const restRef = Math.max(0, s.referralRequired - s.referralCount);
  const cautionReady = s.cautionBalanceCfa >= s.cautionRequiredCfa;
  const gainsOk = s.missionGainsCfa >= s.objectiveCfa;
  const referralsOk = s.referralCount >= s.referralRequired;
  const eligible = cautionReady && gainsOk && referralsOk && s.accountVerified;
  const missing: string[] = [];
  if (!gainsOk) missing.push(`${formatCfa(restObjective)} de gains`);
  if (!cautionReady) missing.push('la caution');
  if (!referralsOk) missing.push(`${restRef} parrainage${restRef > 1 ? 's' : ''}`);

  const cond = (ok: boolean, label: string) => (
    <div className="flex items-center gap-2 py-1">
      <i className={`fas ${ok ? 'fa-check-circle text-[#22C55E]' : 'fa-times-circle text-[#EF4444]'} text-[0.72rem] w-4 text-center shrink-0`}></i>
      <span className={`text-[0.68rem] flex-1 ${ok ? 'text-[#1F2937]' : 'text-[#94A3B8]'}`}>{label}</span>
    </div>
  );

  return (
    <div>
      {/* ===== Présentation du compte (spec §5) ===== */}
      <div className="mb-4">
        <div className="text-[1.15rem] font-black text-[#1F2937]">Bonjour, {firstName} 👋</div>
        <div className="text-[0.72rem] text-[#64748B] mt-0.5">Voici l&apos;état de votre activité aujourd&apos;hui.</div>
      </div>

      {/* ===== Quatre cartes statistiques (spec §6-§9) ===== */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {/* 1. SOLDE */}
        <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(34,197,94,0.1)]"><i className="fas fa-wallet text-[0.7rem] text-[#22C55E]"></i></div>
          <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">Solde disponible</div>
          <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{formatCfa(s.balanceCfa)}</div>
          <div className="text-[0.55rem] text-[#94A3B8] mt-1 leading-relaxed flex-1">Montant actuellement disponible selon les règles du programme.</div>
          <button onClick={() => setPage('wallet')} className="mt-2.5 w-full py-1.5 rounded-lg bg-[rgba(34,197,94,0.08)] text-[#16A34A] text-[0.62rem] font-bold border border-[rgba(34,197,94,0.15)] cursor-pointer transition-transform active:scale-95">Voir mon portefeuille</button>
        </div>

        {/* 2. GAINS DU JOUR */}
        <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(245,158,11,0.1)]"><i className="fas fa-coins text-[0.7rem] text-[#F59E0B]"></i></div>
          <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">Gains aujourd&apos;hui</div>
          <div className="text-[1.05rem] font-black text-[#22C55E] mt-0.5">+{formatCfa(s.todayEarnedCfa)}</div>
          <div className="text-[0.55rem] text-[#94A3B8] mt-1 leading-relaxed flex-1">{s.todayValidated} image{s.todayValidated > 1 ? 's' : ''} validée{s.todayValidated > 1 ? 's' : ''} aujourd&apos;hui.</div>
        </div>

        {/* 3. ACTIVITÉ DU JOUR (compteur 10/jour) */}
        <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(59,130,246,0.1)]"><i className="fas fa-images text-[0.7rem] text-[#3B82F6]"></i></div>
          <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">Images aujourd&apos;hui</div>
          <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{s.todaySubmissions} / {s.dailyLimit}</div>
          <div className="w-full h-1.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden my-1.5">
            <div className="h-full bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] rounded-full transition-all duration-500" style={{ width: `${pctSubs}%` }} />
          </div>
          <div className="text-[0.55rem] text-[#94A3B8] mt-0.5 leading-relaxed flex-1">Il vous reste {restSubs} soumission{restSubs > 1 ? 's' : ''} aujourd&apos;hui.</div>
        </div>

        {/* 4. PARRAINAGE */}
        <div className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(168,85,247,0.1)]"><i className="fas fa-users text-[0.7rem] text-[#A855F7]"></i></div>
          <div className="text-[0.58rem] text-[#94A3B8] font-bold uppercase tracking-wide">Parrainages validés</div>
          <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{s.referralCount} / {s.referralRequired}</div>
          <div className="w-full h-1.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden my-1.5">
            <div className="h-full bg-gradient-to-r from-[#A855F7] to-[#7C3AED] rounded-full transition-all duration-500" style={{ width: `${pctRef}%` }} />
          </div>
          <div className="text-[0.55rem] text-[#94A3B8] mt-0.5 leading-relaxed flex-1">Encore {restRef} pour le seuil du prêt de 5 000 FCFA.</div>
          <button onClick={() => go('referral')} className="mt-2.5 w-full py-1.5 rounded-lg bg-[rgba(168,85,247,0.08)] text-[#7C3AED] text-[0.62rem] font-bold border border-[rgba(168,85,247,0.15)] cursor-pointer transition-transform active:scale-95">Voir mon parrainage</button>
        </div>
      </div>

      {/* ===== Objectif 2 500 FCFA (spec §10) — basé sur les gains de missions, pas le solde ===== */}
      <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2 mb-1">
          <i className="fas fa-bullseye text-[#22C55E] text-[0.8rem]"></i>
          <div className="text-[0.82rem] font-bold text-[#1F2937]">Objectif : 2 500 FCFA</div>
        </div>
        <div className="text-[0.62rem] text-[#94A3B8] mb-3 leading-relaxed">Accumulez au moins {formatCfa(s.objectiveCfa)} grâce aux missions validées pour débloquer cette étape de votre parcours.</div>
        <div className="flex justify-between items-end mb-1.5">
          <div className="text-[0.95rem] font-black text-[#1F2937]">{formatCfa(s.missionGainsCfa)} <span className="text-[#94A3B8] font-semibold text-[0.68rem]">/ {formatCfa(s.objectiveCfa)}</span></div>
          <div className="text-[0.72rem] font-black text-[#22C55E]">{pctObjective} %</div>
        </div>
        <div className="w-full h-3 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${pctObjective}%` }} />
        </div>
        <div className="text-[0.62rem] text-[#64748B] mt-2">
          {gainsOk
            ? '🎉 Objectif atteint ! Cette étape de votre parcours est débloquée.'
            : <>Il vous reste <strong className="text-[#1F2937]">{formatCfa(restObjective)}</strong> pour atteindre cet objectif.</>}
        </div>
      </div>

      {/* ===== Mon éligibilité (spec §12-§13) ===== */}
      <div className={`rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border ${eligible ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.2)]' : 'bg-white border-[rgba(0,0,0,0.03)]'}`}>
        <div className="text-[0.82rem] font-bold text-[#1F2937] mb-0.5">Mon éligibilité</div>
        <div className="text-[0.65rem] text-[#64748B] mb-2.5">Prêt de 5 000 FCFA</div>
        {cond(gainsOk, `Gains minimum — ${formatCfa(s.missionGainsCfa)} / ${formatCfa(s.objectiveCfa)}`)}
        {cond(cautionReady, `Caution — ${formatCfa(s.cautionBalanceCfa)} / ${formatCfa(s.cautionRequiredCfa)}`)}
        {cond(referralsOk, `Parrainages — ${s.referralCount} / ${s.referralRequired}`)}
        {cond(s.accountVerified, 'Compte vérifié')}
        <div className={`mt-3 rounded-xl p-2.5 ${eligible ? 'bg-[rgba(34,197,94,0.1)]' : 'bg-[rgba(0,0,0,0.03)]'}`}>
          {eligible ? (
            <>
              <div className="text-[0.7rem] font-bold text-[#16A34A]">🟢 Conditions remplies</div>
              <div className="text-[0.6rem] text-[#64748B] mt-0.5 leading-relaxed">Vous pouvez maintenant soumettre une demande de prêt.</div>
            </>
          ) : (
            <>
              <div className="text-[0.7rem] font-bold text-[#F59E0B]">Pas encore éligible</div>
              <div className="text-[0.6rem] text-[#64748B] mt-0.5 leading-relaxed">Il vous manque : {missing.join(', ')}.</div>
            </>
          )}
        </div>
        <button onClick={() => go('eligibility')} className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-[0.75rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-[0.97]">
          {eligible ? 'Demander un prêt' : 'Voir les conditions'}
        </button>
      </div>

      {/* ===== Ma caution (spec §14) — visuellement distincte, hors solde ===== */}
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
          <div className="text-[0.62rem] text-[rgba(255,255,255,0.55)] mt-1 leading-relaxed">Montant réservé comme caution selon les conditions du programme.</div>
          <div className="text-[0.6rem] text-[#FBBF24] mt-1.5 flex items-center gap-1.5"><i className="fas fa-shield-alt"></i> Ce montant n&apos;est pas inclus dans votre solde disponible.</div>
        </div>
      </div>

      {/* ===== Missions disponibles (spec §15-§16) — bouton « Voir la mission », JAMAIS « Générer » ===== */}
      <div className="text-[0.82rem] font-black text-[#1F2937] mb-2 mt-1">Missions disponibles</div>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {MOCK_MISSIONS.map(m => {
          const cat = CAT_ICON[m.category] || CAT_ICON.general;
          return (
            <div key={m.id} className="bg-white rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex flex-col">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: cat.color + '15' }}><i className={`fas ${cat.icon} text-[0.7rem]`} style={{ color: cat.color }}></i></div>
              <div className="text-[0.78rem] font-bold text-[#1F2937]">Mission {m.name}</div>
              <div className="text-[0.65rem] text-[#22C55E] font-bold mt-0.5">{m.rewardCfa} FCFA / image</div>
              <div className="text-[0.58rem] text-[#94A3B8] mt-1 flex-1">{m.userDailyCount} / {m.dailyLimit} aujourd&apos;hui</div>
              <button onClick={() => go('campaigns')} className="mt-2.5 w-full py-2 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-[0.65rem] font-bold border-none cursor-pointer shadow-[0_2px_8px_rgba(34,197,94,0.2)] transition-transform active:scale-95">Voir la mission</button>
            </div>
          );
        })}
      </div>

      {/* ===== Comment ça marche ? (spec §17) ===== */}
      <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
        <div className="text-[0.82rem] font-bold text-[#1F2937] mb-3">Comment gagner ?</div>
        {[
          { n: 1, t: 'Choisissez une mission', c: '#22C55E' },
          { n: 2, t: 'Créez votre image avec une IA externe', c: '#3B82F6' },
          { n: 3, t: 'Importez votre image ici', c: '#A855F7' },
          { n: 4, t: "Notre système vérifie l'image", c: '#F59E0B' },
          { n: 5, t: 'Si elle est validée : +25 FCFA', c: '#EF4444' },
        ].map((x, i, arr) => (
          <div key={x.n}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[0.6rem] shrink-0" style={{ background: x.c }}>{x.n}</div>
              <div className="text-[0.7rem] text-[#64748B] flex-1">{x.t}</div>
            </div>
            {i < arr.length - 1 && <div className="text-[#CBD5E1] text-[0.7rem] leading-none my-1 pl-2.5">↓</div>}
          </div>
        ))}
        <div className="text-[0.6rem] text-[#94A3B8] mt-3 italic leading-relaxed">La génération se fait à l&apos;extérieur du site : consultez le brief, créez votre image avec l&apos;outil de votre choix, puis revenez ici pour l&apos;importer.</div>
      </div>

      {/* ===== Activité récente (spec §18) ===== */}
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
        <button onClick={() => go('myimages')} className="w-full mt-3 py-2 rounded-xl bg-[rgba(0,0,0,0.03)] text-[#64748B] text-[0.68rem] font-semibold border border-[rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.97]">Voir tout l&apos;historique</button>
      </div>
    </div>
  );
}

/* ============ CAMPAIGNS VIEW ============ */
function CampV({ camps, onSel }: { camps: Campaign[]; onSel: (c: Campaign) => void }) {
  if (!camps.length) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-3"><i className="fas fa-bullhorn text-[#94A3B8] text-xl"></i></div>
      <div className="text-[0.85rem] font-semibold text-[#64748B]">Aucune campagne active</div>
      <div className="text-[0.72rem] text-[#94A3B8]">De nouvelles missions arriveront bientôt !</div>
    </div>
  );
  return (
    <div>
      <div className="mb-3 p-3.5 bg-[rgba(59,130,246,0.06)] rounded-xl border border-[rgba(59,130,246,0.12)]">
        <div className="text-[0.72rem] font-bold text-[#3B82F6] mb-1"><i className="fas fa-lightbulb mr-1"></i> Astuce</div>
        <div className="text-[0.65rem] text-[#1E40AF]">Utilisez <strong>ChatGPT, DALL-E, Midjourney</strong> ou n&apos;importe quelle IA pour créer vos images, puis uploadez-les ici.</div>
      </div>
      <div className="space-y-3">
        {camps.map(c => {
          const cat = CAT_ICON[c.category] || CAT_ICON.general;
          return (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)` }}>
                  <i className={`fas ${cat.icon} text-white text-[0.95rem]`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.85rem] font-bold text-[#1F2937]">{c.brand}</div>
                  <div className="text-[0.68rem] text-[#64748B]">{c.name}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(34,197,94,0.1)] text-[#22C55E]">+{c.rewardCfa}F</span>
              </div>
              <div className="text-[0.68rem] text-[#64748B] mb-2.5 leading-relaxed line-clamp-2">{c.brief}</div>
              {c.constraints && <div className="text-[0.6rem] text-[#94A3B8] mb-2.5 italic">📌 {c.constraints}</div>}
              <div className="flex items-center gap-3 mb-3 text-[0.6rem] text-[#94A3B8]">
                <span><i className="fas fa-image mr-0.5"></i>{c.totalImages}/{c.maxImages}</span>
                <span><i className="fas fa-check mr-0.5"></i>{c.totalValidated} validées</span>
                <span><i className="fas fa-expand mr-0.5"></i>{c.format}</span>
                <span><i className="fas fa-palette mr-0.5"></i>{c.style}</span>
              </div>
              <button onClick={() => onSel(c)} disabled={c.userDailyCount >= c.dailyLimit} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-[0.78rem] border-none cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(34,197,94,0.2)]">
                <i className="fas fa-upload text-[0.7rem]"></i> {c.userDailyCount >= c.dailyLimit ? 'Limite atteinte' : 'Poster une image'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ MY IMAGES VIEW ============ */
function ImgV({ imgs }: { imgs: MissionImage[] }) {
  if (!imgs.length) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-3"><i className="fas fa-images text-[#94A3B8] text-xl"></i></div>
      <div className="text-[0.85rem] font-semibold text-[#64748B]">Aucune image soumise</div>
      <div className="text-[0.72rem] text-[#94A3B8]">Postez votre première image dans une mission !</div>
    </div>
  );
  return (
    <div className="space-y-2.5">
      {imgs.map(img => {
        const s = ST[img.status] || ST.pending;
        return (
          <div key={img.id} className="bg-white rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.bg }}><i className={`fas ${s.icon} text-[0.85rem]`} style={{ color: s.color }}></i></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5"><span className="text-[0.72rem] font-bold" style={{ color: s.color }}>{s.label}</span>{img.aiScore > 0 && <span className="text-[0.55rem] text-[#94A3B8]">Score: {Math.round(img.aiScore)}%</span>}</div>
              <div className="text-[0.65rem] text-[#64748B]">{img.campaign?.brand} — {img.campaign?.name}</div>
              <div className="text-[0.55rem] text-[#94A3B8]">{new Date(img.createdAt).toLocaleString('fr-FR')}</div>
              {img.aiAnalysis && img.status === 'non_compliant' && (
                <div className="text-[0.55rem] text-[#EF4444] mt-1 italic line-clamp-2">{img.aiAnalysis.substring(0, 150)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ ELIGIBILITY VIEW ============ */
function EligV({ elig, onLoan, onCaution, dash, onLoad }: { elig: any; onLoan: (a: number) => void; onCaution: () => void; dash: DashboardData|null; onLoad: () => void }) {
  if (!elig) return <div className="text-center py-8"><button onClick={onLoad} className="px-4 py-2 rounded-xl bg-[#22C55E] text-white text-[0.78rem] font-semibold border-none cursor-pointer">Vérifier l&apos;éligibilité</button></div>;
  const { smallLoan, largeLoan, userLevel, userLevelLabel } = elig;
  const cond = (m: boolean, t: string) => <div className="flex items-center gap-2 py-1.5"><i className={`fas ${m ? 'fa-check-circle text-[#22C55E]' : 'fa-times-circle text-[#EF4444]'} text-[0.75rem]`}></i><span className={`text-[0.68rem] ${m ? 'text-[#1F2937]' : 'text-[#94A3B8]'}`}>{t}</span></div>;
  return (
    <div>
      {/* User level */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-4 mb-4">
        <div className="text-[0.65rem] text-[rgba(255,255,255,0.5)]">Votre niveau</div>
        <div className="text-[1.3rem] font-black">{userLevelLabel}</div>
        <div className="flex gap-1 mt-2">{[1,2,3,4].map(l => <div key={l} className={`h-1.5 flex-1 rounded-full ${l <= userLevel ? 'bg-[#22C55E]' : 'bg-[rgba(255,255,255,0.15)]'}`} />)}</div>
      </div>

      {/* Caution alert */}
      {dash && dash.cautionStatus !== 'active' && (
        <div className="bg-[rgba(245,158,11,0.06)] rounded-xl p-3.5 mb-3 border border-[rgba(245,158,11,0.1)]">
          <div className="text-[0.72rem] font-bold text-[#F59E0B] mb-1"><i className="fas fa-shield-alt mr-1"></i> Caution non constituée</div>
          <div className="text-[0.62rem] text-[#92400E] mb-2">La caution de {dash.cautionAmountCfa} FCFA est requise pour les prêts. Elle sera bloquée et non retirable.</div>
          <button onClick={onCaution} className="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-white text-[0.68rem] font-semibold border-none cursor-pointer">Constituer la caution</button>
        </div>
      )}

      {/* Eligibility table */}
      <div className="bg-white rounded-2xl overflow-hidden mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
        <div className="p-3.5 bg-[rgba(0,0,0,0.02)] border-b border-[rgba(0,0,0,0.05)]"><div className="text-[0.78rem] font-bold text-[#1F2937]">Tableau d&apos;éligibilité</div></div>
        <table className="w-full text-[0.65rem]">
          <thead><tr className="bg-[rgba(0,0,0,0.02)]"><th className="text-left p-2.5 font-semibold text-[#64748B]">Condition</th><th className="text-center p-2.5 font-semibold text-[#64748B]">5 000 F</th><th className="text-center p-2.5 font-semibold text-[#64748B]">10 000 F</th></tr></thead>
          <tbody>
            <tr className="border-t border-[rgba(0,0,0,0.03)]"><td className="p-2.5">Fonds min.</td><td className={`p-2.5 text-center font-semibold ${smallLoan.fundsEligible ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{smallLoan.fundsCurrent}/{smallLoan.fundsRequired}</td><td className={`p-2.5 text-center font-semibold ${largeLoan.fundsEligible ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{largeLoan.fundsCurrent}/{largeLoan.fundsRequired}</td></tr>
            <tr className="border-t border-[rgba(0,0,0,0.03)]"><td className="p-2.5">Caution</td><td className={`p-2.5 text-center font-semibold ${smallLoan.cautionReady ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{smallLoan.cautionCurrent}/{smallLoan.cautionRequired}</td><td className={`p-2.5 text-center font-semibold ${largeLoan.cautionReady ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{largeLoan.cautionCurrent}/{largeLoan.cautionRequired}</td></tr>
            <tr className="border-t border-[rgba(0,0,0,0.03)]"><td className="p-2.5">Parrainages</td><td className={`p-2.5 text-center font-semibold ${smallLoan.referralsOk ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{smallLoan.referralsCurrent}/{smallLoan.referralsRequired}</td><td className={`p-2.5 text-center font-semibold ${largeLoan.referralsOk ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{largeLoan.referralsCurrent}/{largeLoan.referralsRequired}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Loan cards */}
      {[{ loan: smallLoan, amt: 5000 }, { loan: largeLoan, amt: 10000 }].map(({ loan, amt }) => (
        <div key={amt} className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[0.82rem] font-bold text-[#1F2937]">Prêt de {formatCfa(amt)}</div>
            <span className={`px-2 py-0.5 rounded-full text-[0.55rem] font-bold ${loan.eligible ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]'}`}>{loan.eligible ? '✓ Éligible' : 'Non éligible'}</span>
          </div>
          {cond(loan.fundsEligible, `Gains missions: ${loan.fundsCurrent}/${loan.fundsRequired} FCFA`)}
          {cond(loan.cautionReady, `Caution: ${loan.cautionCurrent}/${loan.cautionRequired} FCFA`)}
          {cond(loan.referralsOk, `Parrainages validés: ${loan.referralsCurrent}/${loan.referralsRequired}`)}
          {cond(loan.accountVerified, 'Compte vérifié')}
          {cond(loan.noOverdueLoan, 'Aucun prêt en retard')}
          {cond(loan.noActiveLoan, 'Aucun prêt en cours')}
          {loan.eligible && <button onClick={() => onLoan(amt)} className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-[0.78rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)]">Demander mon prêt</button>}
        </div>
      ))}
    </div>
  );
}

/* ============ LOANS VIEW ============ */
function LoanV({ loans, onRepay }: { loans: any[]; onRepay: (id: string) => void }) {
  if (!loans.length) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-3"><i className="fas fa-hand-holding-usd text-[#94A3B8] text-xl"></i></div>
      <div className="text-[0.85rem] font-semibold text-[#64748B]">Aucun prêt</div>
      <div className="text-[0.72rem] text-[#94A3B8]">Vérifiez votre éligibilité pour demander un micro-prêt.</div>
    </div>
  );
  return (
    <div className="space-y-3">
      {loans.map(l => {
        const s = LOAN_ST[l.status] || { label: l.status, color: '#94A3B8' };
        return (
          <div key={l.id} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-start mb-2">
              <div><div className="text-[0.85rem] font-bold text-[#1F2937]">{formatCfa(l.amountCfa)}</div><div className="text-[0.65rem] text-[#94A3B8]">{new Date(l.requestedAt).toLocaleDateString('fr-FR')}</div></div>
              <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold" style={{ background: `${s.color}18`, color: s.color }}>{s.label}</span>
            </div>
            {l.dueDate && <div className="text-[0.62rem] text-[#64748B]">Échéance: {new Date(l.dueDate).toLocaleDateString('fr-FR')}</div>}
            <div className="text-[0.68rem] text-[#1F2937] mt-1">Restant: {formatCfa(l.amountRemainingCfa)}</div>
            {['active','repaying','overdue'].includes(l.status) && <button onClick={() => onRepay(l.id)} className="w-full mt-3 py-2 rounded-xl bg-[#22C55E] text-white font-semibold text-[0.72rem] border-none cursor-pointer">Rembourser</button>}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   PARRAINAGE VIEW (spec §4 — « voir les filleuls et le code »)
   Données fictives (MOCK_REFERRALS) structurées comme la réponse
   de GET /api/referral/list → remplacement direct plus tard.
   ============================================================ */
function ParrainV({ code, required, referrals }: { code: string; required: number; referrals: { id: string; name: string; date: string; validated: boolean }[] }) {
  const [copied, setCopied] = useState(false);
  const valides = referrals.filter(r => r.validated).length;
  const rest = Math.max(0, required - valides);
  const pct = Math.min(100, Math.round((valides / required) * 100));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indisponible */ }
  };

  return (
    <div>
      {/* Code de parrainage */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-3 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_65%)]" />
        <div className="relative z-[1]">
          <div className="text-[0.65rem] text-[rgba(255,255,255,0.5)] mb-1.5">Mon code de parrainage</div>
          <div className="flex items-center gap-2.5">
            <div className="text-[1.5rem] font-black tracking-[2px]">{code}</div>
            <button onClick={copy} className={`px-3 py-1.5 rounded-lg text-[0.62rem] font-bold border-none cursor-pointer transition-all active:scale-95 ${copied ? 'bg-[#22C55E] text-white' : 'bg-white/10 text-white'}`}>
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-1`}></i>{copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <div className="text-[0.6rem] text-[rgba(255,255,255,0.45)] mt-2 leading-relaxed">Partagez ce code à vos amis lors de leur inscription.</div>
        </div>
      </div>

      {/* Progression */}
      <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[0.82rem] font-bold text-[#1F2937]">Parrainages validés</div>
          <div className="text-[0.72rem] font-semibold text-[#A855F7]">{valides} / {required}</div>
        </div>
        <div className="w-full h-2.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#A855F7] to-[#7C3AED] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[0.62rem] text-[#94A3B8] mt-1.5">
          {rest === 0
            ? '🎉 Seuil de parrainages atteint !'
            : `Encore ${rest} parrainage${rest > 1 ? 's' : ''} validé${rest > 1 ? 's' : ''} pour atteindre le seuil requis pour le prêt de 5 000 FCFA.`}
        </div>
      </div>

      {/* Liste des filleuls */}
      <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
        <div className="text-[0.82rem] font-bold text-[#1F2937] mb-3">Mes filleuls</div>
        {referrals.length ? (
          <div className="space-y-2.5">
            {referrals.map(r => (
              <div key={r.id} className="flex items-center gap-2.5 pb-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 last:pb-0">
                <div className="w-9 h-9 rounded-full bg-[rgba(168,85,247,0.1)] flex items-center justify-center shrink-0 text-[#7C3AED] text-[0.7rem] font-bold">
                  {r.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.72rem] font-semibold text-[#1F2937]">{r.name}</div>
                  <div className="text-[0.58rem] text-[#94A3B8]">Inscrit le {r.date}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[0.55rem] font-bold ${r.validated ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'}`}>
                  {r.validated ? '✓ Validé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-2"><i className="fas fa-users text-[#94A3B8] text-lg"></i></div>
            <div className="text-[0.75rem] font-semibold text-[#64748B]">Aucun filleul pour l&apos;instant</div>
            <div className="text-[0.65rem] text-[#94A3B8]">Partagez votre code pour commencer !</div>
          </div>
        )}
      </div>

      {/* Explication */}
      <div className="bg-[rgba(59,130,246,0.06)] rounded-xl p-3.5 border border-[rgba(59,130,246,0.12)]">
        <div className="text-[0.72rem] font-bold text-[#3B82F6] mb-1"><i className="fas fa-info-circle mr-1"></i> Comment ça marche ?</div>
        <div className="text-[0.62rem] text-[#1E40AF] leading-relaxed">
          Partagez votre code à vos amis. Lorsqu&apos;ils s&apos;inscrivent avec votre code et deviennent actifs, ils comptent comme parrainages validés.
          {required} parrainages validés font partie des conditions pour accéder au prêt de 5 000 FCFA.
        </div>
      </div>
    </div>
  );
}
