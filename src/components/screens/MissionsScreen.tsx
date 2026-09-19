'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, authFetch, refreshUser, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';

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

export default function MissionsScreen() {
  const { user, setPage, addToast } = useAppStore();
  const [tab, setTab] = useState<'dashboard'|'campaigns'|'myimages'|'eligibility'|'loans'>('dashboard');
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

  const tabs = [
    { id: 'dashboard' as const, icon: 'fa-th-large', label: 'Tableau' },
    { id: 'campaigns' as const, icon: 'fa-bullhorn', label: 'Missions' },
    { id: 'myimages' as const, icon: 'fa-images', label: 'Mes images' },
    { id: 'eligibility' as const, icon: 'fa-chart-bar', label: 'Éligibilité' },
    { id: 'loans' as const, icon: 'fa-hand-holding-usd', label: 'Prêts' },
  ];

  return (
    <>
      <Header title="Espace Jeunes" rightElement={
        <button onClick={() => setPage('profile')} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem]"><i className="far fa-user-circle"></i></button>
      } />
      <div className="flex gap-1 px-4 pt-2 pb-1 overflow-x-auto bg-white border-b border-[rgba(0,0,0,0.05)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'eligibility') loadElig(); if (t.id === 'loans') loadLoans(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all whitespace-nowrap ${tab === t.id ? 'bg-[#22C55E] text-white' : 'bg-[rgba(0,0,0,0.03)] text-[#64748B]'}`}>
            <i className={`fas ${t.icon} text-[0.65rem]`}></i> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && !dash ? <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div>
        : tab === 'dashboard' ? <DashV dash={dash} go={setTab} />
        : tab === 'campaigns' ? <CampV camps={campaigns} onSel={c => { setSelCamp(c); setShowUpload(true); }} />
        : tab === 'myimages' ? <ImgV imgs={images} />
        : tab === 'eligibility' ? <EligV elig={elig} onLoan={reqLoan} onCaution={depositCaution} dash={dash} onLoad={loadElig} />
        : tab === 'loans' ? <LoanV loans={loans} onRepay={repay} />
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

/* ============ DASHBOARD VIEW ============ */
function DashV({ dash, go }: { dash: DashboardData|null; go: (p: any) => void }) {
  if (!dash) return <div className="text-center text-[#94A3B8] py-8">Chargement...</div>;
  const pct = Math.min(100, (dash.missionTotalEarnedCfa / dash.objectiveCfa) * 100);
  return (
    <div>
      {/* Balance card */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(34,197,94,0.15),transparent_65%)]" />
        <div className="relative z-[1]">
          <div className="text-[0.65rem] text-[rgba(255,255,255,0.5)] mb-1">Solde missions</div>
          <div className="text-[1.8rem] font-black tracking-[-1px]">{formatCfa(dash.missionBalanceCfa)}</div>
          <div className="flex gap-3 mt-3">
            <div className="flex-1 bg-[rgba(255,255,255,0.08)] rounded-lg p-2.5">
              <div className="text-[0.55rem] text-[rgba(255,255,255,0.4)]">Gains du jour</div>
              <div className="text-[0.85rem] font-bold text-[#22C55E]">+{dash.validatedToday * dash.rewardPerImage} FCFA</div>
            </div>
            <div className="flex-1 bg-[rgba(255,255,255,0.08)] rounded-lg p-2.5">
              <div className="text-[0.55rem] text-[rgba(255,255,255,0.4)]">Validées aujourd&apos;hui</div>
              <div className="text-[0.85rem] font-bold">{dash.validatedToday}/{dash.dailyLimit}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress toward loan eligibility */}
      <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[0.78rem] font-bold text-[#1F2937]">Objectif pour les prêts</div>
          <div className="text-[0.72rem] font-semibold text-[#22C55E]">{dash.missionTotalEarnedCfa}/{dash.objectiveCfa} FCFA</div>
        </div>
        <div className="w-full h-2.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[0.6rem] text-[#94A3B8] mt-1">{pct >= 100 ? '🎉 Objectif atteint ! Vous pouvez demander un prêt.' : `${Math.round(pct)}% — il vous manque ${dash.objectiveCfa - dash.missionTotalEarnedCfa} FCFA`}</div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {[
          { icon: 'fa-bullhorn', ic: '#22C55E', ib: 'rgba(34,197,94,0.1)', l: 'Campagnes actives', v: String(dash.activeCampaigns), go: () => go('campaigns') },
          { icon: 'fa-shield-alt', ic: '#3B82F6', ib: 'rgba(59,130,246,0.1)', l: 'Caution', v: dash.cautionStatus === 'active' ? 'Constituée' : 'Non constituée', go: () => go('eligibility') },
          { icon: 'fa-users', ic: '#A855F7', ib: 'rgba(168,85,247,0.1)', l: 'Parrainages', v: `${dash.validatedReferralCount}/5`, go: undefined },
          { icon: 'fa-hand-holding-usd', ic: '#F59E0B', ib: 'rgba(245,158,11,0.1)', l: 'Prêts', v: dash.activeLoans > 0 ? `${dash.activeLoans} actif(s)` : 'Aucun', go: () => go('loans') },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]" onClick={c.go} style={c.go ? { cursor: 'pointer' } : {}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: c.ib }}><i className={`fas ${c.icon} text-[0.7rem]`} style={{ color: c.ic }}></i></div>
            <div className="text-[0.65rem] text-[#94A3B8]">{c.l}</div>
            <div className="text-[0.85rem] font-bold text-[#1F2937]">{c.v}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] mb-3">
        <div className="text-[0.78rem] font-bold text-[#1F2937] mb-3">Comment gagner de l&apos;argent ?</div>
        {[
          { s: 1, t: 'Choisissez une campagne de mission', c: '#22C55E', icon: 'fa-bullhorn' },
          { s: 2, t: 'Générez une image avec ChatGPT, DALL-E, Midjourney...', c: '#3B82F6', icon: 'fa-magic' },
          { s: 3, t: 'Uploadez votre image ici (+25 FCFA si validée)', c: '#F59E0B', icon: 'fa-upload' },
          { s: 4, t: 'Atteignez 2 500 FCFA pour débloquer les prêts', c: '#A855F7', icon: 'fa-unlock' },
          { s: 5, t: 'Constituez la caution + parrainages → Demandez votre prêt !', c: '#EF4444', icon: 'fa-hand-holding-usd' },
        ].map((x, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${i < 4 ? 'mb-2.5' : ''}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[0.6rem] shrink-0" style={{ background: x.c }}>{x.s}</div>
            <div className="text-[0.72rem] text-[#64748B] pt-1 flex-1">{x.t}</div>
            <i className={`fas ${x.icon} text-[0.7rem] mt-1`} style={{ color: x.c }}></i>
          </div>
        ))}
      </div>

      {/* Important rules */}
      <div className="bg-[rgba(245,158,11,0.06)] rounded-xl p-3 border border-[rgba(245,158,11,0.1)]">
        <div className="text-[0.72rem] font-bold text-[#F59E0B] mb-1.5"><i className="fas fa-exclamation-triangle mr-1"></i> Règles importantes</div>
        <ul className="text-[0.62rem] text-[#92400E] space-y-1">
          <li>• Créez vos images avec une IA externe (ChatGPT, DALL-E, Midjourney...)</li>
          <li>• Uploadez-les ici — l&apos;IA valide automatiquement la conformité</li>
          <li>• Maximum 10 images rémunérées par jour</li>
          <li>• Les images trop similaires sont refusées (doublons)</li>
          <li>• Les images disparaissent le lendemain pour libérer l&apos;espace</li>
          <li>• La caution n&apos;est pas disponible pour les retraits</li>
        </ul>
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
