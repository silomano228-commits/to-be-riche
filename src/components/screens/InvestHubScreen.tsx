'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, authFetch, refreshUser as globalRefreshUser } from '@/lib/store';
import { Header, INVEST_LEVELS } from '@/components/shared';
import { CongratulationsModal, type CongratulationsData } from '@/components/CongratulationsModal';
import PaymentDetails from '@/components/PaymentDetails';

// ---------- helpers ----------
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

type PaymentMethod = 'yas' | 'trx';
type PayoutMethod = 'main' | 'yas_trx';

interface InvestSummary {
  total: number;
  active: number;
  completed: number;
  totalEarned: number;
  totalInvested: number;
}

export default function InvestHubScreen() {
  const { user, addToast } = useAppStore();
  const [investments, setInvestments] = useState<any[]>([]);
  const [summary, setSummary] = useState<InvestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Create-investment modal state
  const [showCreate, setShowCreate] = useState<number | null>(null);
  const [createAmt, setCreateAmt] = useState('');
  const [creating, setCreating] = useState(false);

  // Unlock modal state
  const [unlockLevel, setUnlockLevel] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Claim payout modal state
  const [claimTarget, setClaimTarget] = useState<{ id: string; level: number; amount: number; rate: number; gain: number } | null>(null);
  const [payoutChoice, setPayoutChoice] = useState<PayoutMethod>('main');
  const [claiming, setClaiming] = useState(false);

  // Congratulations modal
  const [congrats, setCongrats] = useState<CongratulationsData>({ show: false, type: 'collect' });

  // ---------- data loading ----------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadInvestments = useCallback(async () => {
    try {
      const res = await authFetch('/api/invest/list');
      const data = await res.json();
      if (data.success) {
        setInvestments(data.investments || []);
        setSummary(data.summary || null);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { loadInvestments(); }, 0);
    return () => clearTimeout(t);
  }, [loadInvestments]);

  const refreshUser = async () => { await globalRefreshUser(); };

  // ---------- create investment ----------
  const openCreate = (level: number) => {
    setShowCreate(level);
    setCreateAmt('');
  };

  const handleCreate = async (method: PaymentMethod, userAddress: string) => {
    if (showCreate == null) return;
    const level = showCreate;
    const lvl = INVEST_LEVELS[level - 1];
    if (!lvl) return;
    const amt = parseFloat(createAmt);
    if (!amt || amt < lvl.min || amt > lvl.max) {
      addToast(`Montant: $${lvl.min} - $${lvl.max}`, 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/api/invest/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          amount: amt,
          paymentMethod: method,
          userAddress: userAddress.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(null);
        loadInvestments();
        refreshUser();
        setCongrats({
          show: true,
          type: 'generic',
          title: 'Investissement créé !',
          amount: amt,
          message: data.message || `Votre investissement Niveau ${level} (${lvl.name}) de ${formatMoney(amt)} est actif. Paiement ${method.toUpperCase()} en cours — fonds disponibles dans les 6 heures. Collecte quotidienne illimitée !`,
          onClose: () => setCongrats(c => ({ ...c, show: false })),
        });
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setCreating(false);
  };

  // ---------- unlock level ----------
  const handleUnlock = async (level: number) => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      const res = await authFetch('/api/invest/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Niveau débloqué !', 'success');
        setUnlockLevel(null);
        refreshUser();
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setUnlocking(false);
  };

  // ---------- claim payout ----------
  const openClaim = (inv: any) => {
    const lvl = INVEST_LEVELS[inv.level - 1];
    const gain = Math.round(inv.amount * inv.rate / 100 * 100) / 100;
    setClaimTarget({ id: inv.id, level: inv.level, amount: inv.amount, rate: inv.rate, gain });
    setPayoutChoice('main'); // default to main; YAS/TRX only enabled if gain >= 5
  };

  const handleClaimMain = async () => {
    if (!claimTarget) return;
    setClaiming(true);
    try {
      const res = await authFetch('/api/invest/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentId: claimTarget.id, payoutMethod: 'main' }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimTarget(null);
        loadInvestments();
        refreshUser();
        setCongrats({
          show: true,
          type: 'collect',
          amount: data.gain,
          title: 'Collecte réussie !',
          message: data.message || `Vous avez réclamé ${formatMoney(data.gain)} versé sur votre compte principal.`,
          onClose: () => setCongrats(c => ({ ...c, show: false })),
        });
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setClaiming(false);
  };

  const handleClaimYasTrx = async (method: PaymentMethod, userAddress: string) => {
    if (!claimTarget) return;
    if (claimTarget.gain < 5) {
      addToast('Gain insuffisant pour YAS/TRX (min $5)', 'error');
      return;
    }
    setClaiming(true);
    try {
      const res = await authFetch('/api/invest/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investmentId: claimTarget.id,
          payoutMethod: 'yas_trx',
          userAddress: userAddress.trim(),
          paymentType: method,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimTarget(null);
        loadInvestments();
        refreshUser();
        setCongrats({
          show: true,
          type: 'collect',
          amount: data.gain,
          title: 'Collecte réussie !',
          message: data.message || `Vous avez réclamé ${formatMoney(data.gain)} — retrait demandé, fonds dans les 6h.`,
          onClose: () => setCongrats(c => ({ ...c, show: false })),
        });
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setClaiming(false);
  };

  if (!user) return null;

  const unlockedLevel = (user as any).unlockedLevel || 1;
  const referralCount = (user as any).referralCount || 0;
  const activeInv = investments.filter(i => i.status === 'active');
  const completedInv = investments.filter(i => i.status === 'completed');

  // Unlock is referral-based ONLY — no previous-level investment requirement.
  // Users may hold multiple active investments at the same unlocked level (unlimited count).
  const getUnlockInfo = (level: number) => {
    const lvl = INVEST_LEVELS[level - 1];
    if (!lvl) return null;
    const required = lvl.requiredReferrals;
    const missing = Math.max(0, required - referralCount);
    return { required, missing, canUnlock: missing === 0 };
  };

  // ---------- render ----------
  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes claimPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.45); transform: scale(1); } 50% { box-shadow: 0 0 0 10px rgba(34,197,94,0); transform: scale(1.03); } }
        @keyframes timerColon { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes heroGlow { 0%,100% { box-shadow: 0 0 24px rgba(34,197,94,0.12); } 50% { box-shadow: 0 0 40px rgba(20,184,166,0.18); } }
        .claim-pulse { animation: claimPulse 1.6s ease-in-out infinite; }
        .timer-colon { animation: timerColon 1s step-end infinite; }
        .hero-glow { animation: heroGlow 3.5s ease-in-out infinite; }
        .pm-card { transition: transform .15s ease, box-shadow .15s ease; }
        .pm-card:active { transform: scale(0.98); }
      `}</style>

      <Header
        title="Investir"
        icon="fa-chart-line"
        iconColor="#22C55E"
        leftElement={
          <button
            onClick={() => useAppStore.getState().setPage('home')}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none mr-1"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.55)' }}
            aria-label="Retour"
          >
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
      />

      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0" style={{ background: '#F6F8F7' }}>

        {/* Hero summary card (replaces investBalance) */}
        <div
          className="hero-glow rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #16A34A 0%, #14B8A6 100%)',
            color: '#FFFFFF',
          }}
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
          <div className="absolute top-3 right-4 text-[0.6rem] font-mono opacity-50">INVEST·HUB</div>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <i className="fas fa-seedling text-[0.85rem] text-white"></i>
            </div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[1.5px] opacity-90">Vos gains investis</div>
          </div>

          <div className="text-[2.1rem] font-black mb-3 tracking-tight leading-none">
            +{formatMoney(summary?.totalEarned ?? 0)}
          </div>

          <div className="grid grid-cols-2 gap-3 text-[0.7rem]">
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="opacity-80 uppercase tracking-wide text-[0.6rem]">Investi</div>
              <div className="font-bold text-[0.95rem]">{formatMoney(summary?.totalInvested ?? 0)}</div>
            </div>
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="opacity-80 uppercase tracking-wide text-[0.6rem]">Actifs</div>
              <div className="font-bold text-[0.95rem]">{summary?.active ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Info banner: unlimited collection */}
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-2.5"
          style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.18)' }}
        >
          <i className="fas fa-infinity text-[0.85rem] mt-0.5" style={{ color: '#14B8A6' }}></i>
          <div>
            <div className="text-[0.78rem] font-bold" style={{ color: '#0F766E' }}>Collecte quotidienne illimitée</div>
            <div className="text-[0.7rem] mt-0.5" style={{ color: 'rgba(15,118,110,0.85)' }}>
              Tous les niveaux rapportent 5%/jour. Le dépôt se fait directement par YAS ou TRX.
            </div>
          </div>
        </div>

        {/* Claimable alert */}
        {activeInv.some(i => i.canClaim) && (
          <div
            className="rounded-xl p-3.5 mb-4 flex items-center gap-3"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.18)', animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <i className="fas fa-gift text-[0.95rem]" style={{ color: '#22C55E' }}></i>
            </div>
            <div className="flex-1">
              <div className="text-[0.82rem] font-bold" style={{ color: '#15803D' }}>Gains à réclamer !</div>
              <div className="text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>Faites défiler jusqu'à vos investissements actifs.</div>
            </div>
          </div>
        )}

        {/* ---------- Investment levels ---------- */}
        <h3 className="text-[0.88rem] font-bold mb-2.5 flex items-center gap-1.5" style={{ color: '#1F2937' }}>
          <i className="fas fa-layer-group text-[0.75rem]" style={{ color: '#14B8A6' }}></i>
          Niveaux d'investissement
        </h3>
        <div className="space-y-3 mb-5">
          {INVEST_LEVELS.map((lvl) => {
            const isUnlocked = lvl.level <= unlockedLevel;
            const canInvest = isUnlocked; // unlock is referral-based only — no previous-level requirement
            const info = getUnlockInfo(lvl.level);

            return (
              <div
                key={lvl.level}
                className="rounded-2xl overflow-hidden relative"
                style={{
                  background: canInvest ? '#FFFFFF' : '#F3F4F6',
                  border: `1px solid ${canInvest ? hexToRgba(lvl.color, 0.22) : 'rgba(0,0,0,0.06)'}`,
                  animation: 'slideUp 0.3s ease-out',
                }}
              >
                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: canInvest ? hexToRgba(lvl.color, 0.14) : 'rgba(0,0,0,0.06)' }}
                    >
                      <i
                        className={`fas ${isUnlocked ? lvl.icon : 'fa-lock'} text-[1rem]`}
                        style={{ color: canInvest ? lvl.color : 'rgba(0,0,0,0.3)' }}
                      ></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.92rem] font-bold truncate" style={{ color: canInvest ? '#1F2937' : 'rgba(0,0,0,0.5)' }}>
                        Niv. {lvl.level} — {lvl.name}
                      </div>
                      <div className="text-[0.68rem] mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: 'rgba(0,0,0,0.55)' }}>
                        <span><i className="fas fa-coins text-[0.55rem] mr-0.5"></i>${lvl.min}-${lvl.max}</span>
                        <span style={{ color: '#16A34A' }}><i className="fas fa-arrow-trend-up text-[0.55rem] mr-0.5"></i>{lvl.rate}%/jour</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span
                      className="text-[0.62rem] font-semibold px-2 py-1 rounded-md flex items-center gap-1"
                      style={{ background: 'rgba(20,184,166,0.1)', color: '#0F766E' }}
                    >
                      <i className="fas fa-infinity text-[0.5rem]"></i>Collecte illimitée
                    </span>
                    {lvl.requiredReferrals > 0 && (
                      <span
                        className="text-[0.62rem] font-semibold px-2 py-1 rounded-md flex items-center gap-1"
                        style={{
                          background: isUnlocked ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
                          color: isUnlocked ? '#16A34A' : 'rgba(0,0,0,0.5)',
                        }}
                      >
                        <i className="fas fa-users text-[0.5rem]"></i>{lvl.requiredReferrals} parrainés
                        {isUnlocked && <i className="fas fa-check text-[0.5rem] ml-0.5"></i>}
                      </span>
                    )}
                    {lvl.level === 1 && (
                      <span className="text-[0.62rem] font-semibold px-2 py-1 rounded-md flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>
                        <i className="fas fa-unlock text-[0.5rem]"></i>Libre
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  {canInvest ? (
                    <button
                      onClick={() => openCreate(lvl.level)}
                      className="w-full py-2.5 rounded-xl text-[0.82rem] font-bold border-none cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      style={{ background: lvl.color, color: '#FFFFFF', boxShadow: `0 3px 12px ${hexToRgba(lvl.color, 0.28)}` }}
                    >
                      <i className="fas fa-hand-holding-dollar text-[0.7rem]"></i>Investir
                    </button>
                  ) : (
                    <button
                      onClick={() => setUnlockLevel(lvl.level)}
                      className="w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      style={{ background: hexToRgba(lvl.color, 0.1), color: lvl.color, border: `1px solid ${hexToRgba(lvl.color, 0.22)}` }}
                    >
                      <i className="fas fa-lock-open text-[0.7rem]"></i>Débloquer
                      {info && info.missing > 0 && (
                        <span className="opacity-80 text-[0.7rem]">· {referralCount}/{info.required}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- Active investments (vertical cards) ---------- */}
        {activeInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold mb-2.5 flex items-center gap-1.5" style={{ color: '#1F2937' }}>
              <i className="fas fa-bolt text-[0.75rem]" style={{ color: '#F59E0B' }}></i>
              Investissements actifs
            </h3>
            <div className="space-y-3 mb-5">
              {activeInv.map((inv) => {
                const lvl = INVEST_LEVELS[inv.level - 1];
                const nextMs = inv.nextClaimAt ? new Date(inv.nextClaimAt).getTime() - now : (inv.nextClaimInMs ?? 0);
                const canClaim = inv.canClaim || nextMs <= 0;
                const hours = Math.max(0, Math.floor(nextMs / 3600000));
                const mins = Math.max(0, Math.floor((nextMs % 3600000) / 60000));
                const secs = Math.max(0, Math.floor((nextMs % 60000) / 1000));
                const gain = Math.round(inv.amount * inv.rate / 100 * 100) / 100;

                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${hexToRgba(lvl.color, 0.18)}`,
                      animation: 'slideUp 0.3s ease-out',
                    }}
                  >
                    {/* Top: level icon + name + unlimited badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: hexToRgba(lvl.color, 0.14) }}
                        >
                          <i className={`fas ${lvl.icon} text-[1rem]`} style={{ color: lvl.color }}></i>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[0.9rem] font-bold truncate" style={{ color: '#1F2937' }}>
                            Niv. {inv.level} — {lvl.name}
                          </div>
                          <div className="text-[0.7rem] mt-0.5" style={{ color: 'rgba(0,0,0,0.55)' }}>
                            {formatMoney(inv.amount)} · {inv.rate}%/jour
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-[0.6rem] font-semibold px-2 py-1 rounded-md flex items-center gap-1 shrink-0"
                        style={{ background: 'rgba(20,184,166,0.1)', color: '#0F766E' }}
                      >
                        <i className="fas fa-infinity text-[0.5rem]"></i>Illimité
                      </span>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <div className="text-[0.6rem] uppercase tracking-wide" style={{ color: 'rgba(0,0,0,0.45)' }}>Collectes</div>
                        <div className="text-[0.9rem] font-bold" style={{ color: '#1F2937' }}>
                          {inv.doneCycles || 0}
                          <span className="text-[0.65rem] font-medium ml-1" style={{ color: 'rgba(0,0,0,0.4)' }}>jours</span>
                        </div>
                      </div>
                      <div className="rounded-xl p-2.5" style={{ background: 'rgba(34,197,94,0.06)' }}>
                        <div className="text-[0.6rem] uppercase tracking-wide" style={{ color: 'rgba(15,118,110,0.7)' }}>Gagné</div>
                        <div className="text-[0.9rem] font-black" style={{ color: '#16A34A' }}>+{formatMoney(inv.earned || 0)}</div>
                      </div>
                    </div>

                    {/* Action row: countdown or claim button */}
                    {canClaim ? (
                      <button
                        onClick={() => openClaim(inv)}
                        className="claim-pulse w-full py-3 rounded-xl text-[0.88rem] font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{ background: '#22C55E', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(34,197,94,0.32)' }}
                      >
                        <i className="fas fa-hand-holding-dollar text-[0.8rem]"></i>
                        Collecter +{formatMoney(gain)}
                      </button>
                    ) : (
                      <div
                        className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2"
                        style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}
                      >
                        <i className="fas fa-clock text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.4)' }}></i>
                        <span className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>Prochaine dans</span>
                        <span className="text-[0.85rem] font-mono font-bold" style={{ color: 'rgba(0,0,0,0.7)' }}>
                          {hours}<span className="timer-colon">:</span>{mins.toString().padStart(2, '0')}<span className="timer-colon">:</span>{secs.toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ---------- Completed investments ---------- */}
        {completedInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold mb-2.5 mt-2 flex items-center gap-1.5" style={{ color: '#1F2937' }}>
              <i className="fas fa-check-circle text-[0.75rem]" style={{ color: '#6B7280' }}></i>
              Terminés
            </h3>
            <div className="space-y-2 mb-5">
              {completedInv.map((inv) => {
                const lvl = INVEST_LEVELS[inv.level - 1];
                return (
                  <div key={inv.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: hexToRgba(lvl.color, 0.12) }}>
                        <i className={`fas ${lvl.icon} text-[0.7rem]`} style={{ color: lvl.color }}></i>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[0.8rem] font-semibold truncate" style={{ color: '#1F2937' }}>Niv. {inv.level} — {lvl.name}</div>
                        <div className="text-[0.62rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>
                          {formatMoney(inv.amount)} · {inv.doneCycles || 0} collectes
                        </div>
                      </div>
                    </div>
                    <div className="text-[0.85rem] font-bold" style={{ color: '#16A34A' }}>+{formatMoney(inv.earned)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty state */}
        {investments.length === 0 && !loading && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.08)' }}>
              <i className="fas fa-seedling text-[1.6rem]" style={{ color: '#22C55E' }}></i>
            </div>
            <p className="text-[0.88rem] font-bold" style={{ color: '#1F2937' }}>Aucun investissement</p>
            <p className="text-[0.72rem] mt-1" style={{ color: 'rgba(0,0,0,0.45)' }}>Choisissez un niveau ci-dessus pour commencer !</p>
          </div>
        )}
      </div>

      {/* ---------- Create investment modal ---------- */}
      {showCreate && (() => {
        const lvl = INVEST_LEVELS[showCreate - 1];
        if (!lvl) return null;
        const amtNum = parseFloat(createAmt);
        const validAmt = createAmt && !isNaN(amtNum) && amtNum >= lvl.min && amtNum <= lvl.max;
        const dailyGain = validAmt ? (amtNum * lvl.rate / 100) : 0;

        return (
          <div
            className="fixed inset-0 z-[6000] flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', animation: 'modalIn 0.2s ease-out' }}
            onClick={() => setShowCreate(null)}
          >
            <div
              className="rounded-t-3xl sm:rounded-3xl p-5 w-full sm:w-[88%] max-w-[380px] max-h-[92vh] overflow-y-auto"
              style={{ background: '#FFFFFF', boxShadow: '0 -8px 24px rgba(0,0,0,0.12)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.14) }}>
                  <i className={`fas ${lvl.icon} text-[1rem]`} style={{ color: lvl.color }}></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-[1rem] font-bold" style={{ color: '#1F2937' }}>Niv. {lvl.level} — {lvl.name}</h3>
                  <p className="text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>
                    {lvl.rate}%/jour · Collecte illimitée · ${lvl.min}-${lvl.max}
                  </p>
                </div>
                <button onClick={() => setShowCreate(null)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-none" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <i className="fas fa-times text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.5)' }}></i>
                </button>
              </div>

              {/* Amount input */}
              <label className="text-[0.7rem] font-semibold mb-1.5 block" style={{ color: '#374151' }}>Montant à investir ($)</label>
              <input
                type="number"
                step="0.01"
                value={createAmt}
                onChange={(e) => setCreateAmt(e.target.value)}
                placeholder={`$${lvl.min} - $${lvl.max}`}
                className="w-full py-3 px-4 rounded-xl text-[1rem] font-bold outline-none mb-2"
                style={{ background: 'rgba(0,0,0,0.04)', border: `1.5px solid ${createAmt ? (validAmt ? hexToRgba(lvl.color, 0.4) : 'rgba(239,68,68,0.4)') : 'rgba(0,0,0,0.08)'}`, color: '#1F2937' }}
              />
              {createAmt && !validAmt && (
                <div className="text-[0.65rem] mb-2" style={{ color: '#EF4444' }}>
                  <i className="fas fa-circle-exclamation mr-1"></i>Doit être entre ${lvl.min} et ${lvl.max}
                </div>
              )}

              {/* Daily gain preview */}
              {validAmt && (
                <div className="rounded-xl p-3 mb-3 flex items-center justify-between" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <span className="text-[0.72rem] font-semibold" style={{ color: '#15803D' }}>
                    <i className="fas fa-arrow-trend-up mr-1"></i>Gain quotidien
                  </span>
                  <span className="text-[0.95rem] font-black" style={{ color: '#16A34A' }}>+{formatMoney(dailyGain)}</span>
                </div>
              )}

              {/* Payment details — same mechanism as principal account deposit */}
              {validAmt ? (
                <PaymentDetails
                  mode="deposit"
                  amountUsd={amtNum}
                  initialMethod="yas"
                  onConfirm={handleCreate}
                  onCancel={() => setShowCreate(null)}
                  loading={creating}
                  ctaText="Confirmer le dépôt"
                />
              ) : (
                <div className="text-center py-4 text-[0.75rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>
                  <i className="fas fa-info-circle mr-1"></i>
                  Saisissez un montant valide (${lvl.min}-${lvl.max}) pour continuer.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ---------- Unlock level modal ---------- */}
      {unlockLevel && (() => {
        const lvl = INVEST_LEVELS[unlockLevel - 1];
        if (!lvl) return null;
        const info = getUnlockInfo(unlockLevel);
        if (!info) return null;

        return (
          <div
            className="fixed inset-0 z-[6000] flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', animation: 'modalIn 0.2s ease-out' }}
            onClick={() => setUnlockLevel(null)}
          >
            <div
              className="rounded-t-3xl sm:rounded-3xl p-5 w-full sm:w-[88%] max-w-[380px]"
              style={{ background: '#FFFFFF', boxShadow: '0 -8px 24px rgba(0,0,0,0.12)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.14) }}>
                  <i className="fas fa-lock-open text-[1rem]" style={{ color: lvl.color }}></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-[1rem] font-bold" style={{ color: '#1F2937' }}>Débloquer Niv. {lvl.level}</h3>
                  <p className="text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>{lvl.name} · {lvl.rate}%/jour · Illimité</p>
                </div>
                <button onClick={() => setUnlockLevel(null)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-none" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <i className="fas fa-times text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.5)' }}></i>
                </button>
              </div>

              {/* Referral requirement card */}
              <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.78rem] font-semibold" style={{ color: '#1F2937' }}>Parrainés requis</span>
                  <span className="text-[0.85rem] font-black" style={{ color: info.canUnlock ? '#16A34A' : '#F59E0B' }}>
                    {referralCount}/{info.required}
                    {info.canUnlock && <i className="fas fa-check ml-1.5 text-[0.7rem]"></i>}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (referralCount / info.required) * 100)}%`,
                      background: info.canUnlock ? '#22C55E' : '#F59E0B',
                    }}
                  ></div>
                </div>
                {info.canUnlock ? (
                  <div className="text-[0.66rem]" style={{ color: '#16A34A' }}>
                    <i className="fas fa-circle-check mr-1"></i>Vous avez assez de parrainés pour débloquer gratuitement !
                  </div>
                ) : (
                  <div className="text-[0.66rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>
                    <i className="fas fa-users mr-1"></i>Il vous manque <b style={{ color: '#F59E0B' }}>{info.missing}</b> parrainé(s).
                  </div>
                )}
              </div>

              {/* Level info */}
              <div className="rounded-xl p-2.5 mb-4" style={{ background: hexToRgba(lvl.color, 0.06), border: `1px solid ${hexToRgba(lvl.color, 0.12)}` }}>
                <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>
                  <i className="fas fa-info-circle mr-1"></i>
                  Niv. {lvl.level}: ${lvl.min}-${lvl.max} · {lvl.rate}%/jour · Collecte illimitée
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUnlockLevel(null)}
                  className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.55)' }}
                >
                  Annuler
                </button>
                {info.canUnlock ? (
                  <button
                    onClick={() => handleUnlock(unlockLevel)}
                    disabled={unlocking}
                    className="flex-1 py-3 rounded-xl font-bold text-[0.82rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                    style={{ background: lvl.color, color: '#FFFFFF', boxShadow: `0 4px 16px ${hexToRgba(lvl.color, 0.28)}` }}
                  >
                    {unlocking ? <i className="fas fa-spinner fa-spin"></i> : 'Débloquer gratuitement'}
                  </button>
                ) : (
                  <div
                    className="flex-1 py-3 rounded-xl text-[0.78rem] font-semibold text-center flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.4)' }}
                  >
                    <i className="fas fa-users"></i>Parrainés insuffisants
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---------- Claim payout modal ---------- */}
      {claimTarget && (() => {
        const lvl = INVEST_LEVELS[claimTarget.level - 1];
        if (!lvl) return null;
        const canWithdraw = claimTarget.gain >= 5;

        return (
          <div
            className="fixed inset-0 z-[6000] flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', animation: 'modalIn 0.2s ease-out' }}
            onClick={() => setClaimTarget(null)}
          >
            <div
              className="rounded-t-3xl sm:rounded-3xl p-5 w-full sm:w-[88%] max-w-[380px] max-h-[92vh] overflow-y-auto"
              style={{ background: '#FFFFFF', boxShadow: '0 -8px 24px rgba(0,0,0,0.12)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.14) }}>
                  <i className={`fas ${lvl.icon} text-[1rem]`} style={{ color: lvl.color }}></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-[1rem] font-bold" style={{ color: '#1F2937' }}>Collecter le gain</h3>
                  <p className="text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>Niv. {claimTarget.level} — {lvl.name}</p>
                </div>
                <button onClick={() => setClaimTarget(null)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-none" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <i className="fas fa-times text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.5)' }}></i>
                </button>
              </div>

              {/* Gain display */}
              <div
                className="rounded-2xl p-4 mb-4 text-center"
                style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(20,184,166,0.08))', border: '1px solid rgba(34,197,94,0.18)' }}
              >
                <div className="text-[0.65rem] uppercase tracking-widest font-bold mb-1" style={{ color: 'rgba(0,0,0,0.45)' }}>Gain à collecter</div>
                <div
                  className="text-[2.2rem] font-black leading-none"
                  style={{ background: 'linear-gradient(135deg, #22C55E, #14B8A6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  +${claimTarget.gain.toFixed(2)}
                </div>
              </div>

              {/* Payout options */}
              <div className="space-y-2.5 mb-3">
                {/* Option A: main account */}
                <button
                  onClick={() => setPayoutChoice('main')}
                  className="pm-card w-full rounded-2xl p-3.5 border-2 cursor-pointer text-left flex items-start gap-3"
                  style={{
                    background: payoutChoice === 'main' ? 'rgba(34,197,94,0.06)' : '#FFFFFF',
                    borderColor: payoutChoice === 'main' ? '#22C55E' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.14)' }}>
                    <i className="fas fa-wallet text-[0.85rem]" style={{ color: '#22C55E' }}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] font-bold" style={{ color: '#1F2937' }}>Verser sur le compte principal</div>
                    <div className="text-[0.65rem] mt-0.5" style={{ color: 'rgba(0,0,0,0.55)' }}>Crédité immédiatement · Aucun minimum</div>
                  </div>
                  {payoutChoice === 'main' && (
                    <i className="fas fa-circle-check text-[0.9rem]" style={{ color: '#22C55E' }}></i>
                  )}
                </button>

                {/* Option B: YAS/TRX withdrawal */}
                <button
                  onClick={() => canWithdraw && setPayoutChoice('yas_trx')}
                  disabled={!canWithdraw}
                  className="pm-card w-full rounded-2xl p-3.5 border-2 cursor-pointer text-left flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: payoutChoice === 'yas_trx' ? 'rgba(20,184,166,0.06)' : '#FFFFFF',
                    borderColor: payoutChoice === 'yas_trx' ? '#14B8A6' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(20,184,166,0.14)' }}>
                    <i className="fas fa-money-bill-transfer text-[0.85rem]" style={{ color: '#14B8A6' }}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] font-bold flex items-center gap-1.5" style={{ color: '#1F2937' }}>
                      Retirer par YAS / TRX
                      {!canWithdraw && (
                        <span className="text-[0.55rem] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>MIN $5</span>
                      )}
                    </div>
                    <div className="text-[0.65rem] mt-0.5" style={{ color: 'rgba(0,0,0,0.55)' }}>Retrait direct · Fonds dans les 6 heures</div>
                  </div>
                  {payoutChoice === 'yas_trx' && (
                    <i className="fas fa-circle-check text-[0.9rem]" style={{ color: '#14B8A6' }}></i>
                  )}
                </button>
              </div>

              {/* Conditional content based on payout choice */}
              {payoutChoice === 'main' ? (
                <>
                  {!canWithdraw && (
                    <div className="rounded-xl p-2.5 mb-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <i className="fas fa-circle-info text-[0.7rem] mt-0.5" style={{ color: '#F59E0B' }}></i>
                      <span className="text-[0.65rem]" style={{ color: 'rgba(180,83,9,0.95)' }}>
                        Le retrait direct par YAS/TRX nécessite un gain minimum de $5. Votre gain actuel est de ${claimTarget.gain.toFixed(2)}. Vous pouvez le verser sur votre compte principal sans minimum.
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setClaimTarget(null)}
                      className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer"
                      style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.55)' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleClaimMain}
                      disabled={claiming}
                      className="flex-[2] py-3 rounded-xl font-bold text-[0.82rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
                    >
                      {claiming ? <i className="fas fa-spinner fa-spin"></i> : `Collecter +$${claimTarget.gain.toFixed(2)}`}
                    </button>
                  </div>
                </>
              ) : canWithdraw ? (
                <PaymentDetails
                  mode="withdraw"
                  amountUsd={claimTarget.gain}
                  initialMethod="yas"
                  onConfirm={handleClaimYasTrx}
                  onCancel={() => setClaimTarget(null)}
                  loading={claiming}
                  ctaText={`Collecter +$${claimTarget.gain.toFixed(2)}`}
                />
              ) : (
                <>
                  <div className="rounded-xl p-2.5 mb-3 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                    <i className="fas fa-circle-exclamation text-[0.7rem] mt-0.5" style={{ color: '#EF4444' }}></i>
                    <span className="text-[0.65rem]" style={{ color: 'rgba(127,29,29,0.95)' }}>
                      Le retrait direct par YAS/TRX nécessite un gain minimum de $5. Votre gain actuel est de ${claimTarget.gain.toFixed(2)}. Choisissez « Verser sur le compte principal ».
                    </span>
                  </div>
                  <button
                    onClick={() => setPayoutChoice('main')}
                    className="w-full py-3 rounded-xl font-bold text-[0.82rem] border-none cursor-pointer transition-all active:scale-[0.98]"
                    style={{ background: lvl.color, color: '#FFFFFF' }}
                  >
                    <i className="fas fa-arrow-left mr-1"></i>Retour au compte principal
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      <CongratulationsModal data={congrats} />
    </>
  );
}
