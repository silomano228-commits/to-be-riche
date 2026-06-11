'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, refreshUser as globalRefreshUser, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function InvestHubScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState<number | null>(null);
  const [createAmt, setCreateAmt] = useState('');
  const [creating, setCreating] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockLevel, setUnlockLevel] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadInvestments = useCallback(async () => {
    try {
      const res = await authFetch('/api/invest/list');
      const data = await res.json();
      if (data.success) setInvestments(data.investments || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => { loadInvestments(); }, 0); return () => clearTimeout(t); }, [loadInvestments]);

  const refreshUser = async () => { await globalRefreshUser(); };

  const handleCreate = async (level: number) => {
    const amt = parseFloat(createAmt);
    const lvl = INVEST_LEVELS[level - 1];
    if (!amt || amt < lvl.min || amt > lvl.max) { addToast(`Montant: $${lvl.min} - $${lvl.max}`, 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/invest/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level, amount: amt }) });
      const data = await res.json();
      if (data.success) { addToast('Investissement créé !', 'success'); setShowCreate(null); setCreateAmt(''); loadInvestments(); refreshUser(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  const [claimPayFee, setClaimPayFee] = useState(false);

  const handleClaim = async (id: string, payFee = false) => {
    try {
      const res = await authFetch('/api/invest/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ investmentId: id, payFee }) });
      const data = await res.json();
      if (data.success) {
        addToast('Gain réclamé ! +' + formatMoney(data.gain), 'success');
        if (data.blocked) addToast(data.message, 'info');
        loadInvestments(); refreshUser();
        setClaimPayFee(false);
      } else if (data.needsReferral) {
        setClaimPayFee(true);
        addToast(data.error, 'error');
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
  };

  const handleUnlock = async (level: number) => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      const res = await authFetch('/api/invest/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level }) });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
        setUnlockLevel(null);
        refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setUnlocking(false);
  };

  if (!user) return null;

  const unlockedLevel = (user as any).unlockedLevel || 1;
  const activeInv = investments.filter(i => i.status === 'active');
  const completedInv = investments.filter(i => i.status === 'completed');

  // Check which levels user has invested in
  const investedLevels = new Set(investments.map(i => i.level));

  // For each level, check if user can invest
  const canInvestIn = (level: number): { canInvest: boolean; reason?: string } => {
    const lvl = INVEST_LEVELS[level - 1];
    if (!lvl) return { canInvest: false, reason: 'Niveau invalide' };

    // Level 1 is always accessible
    if (level === 1) return { canInvest: true };

    // Check if level is unlocked
    if (level > unlockedLevel) {
      const missingReferrals = Math.max(0, lvl.requiredReferrals - user.referralCount);
      const fee = missingReferrals * lvl.unlockFee;
      if (missingReferrals > 0) {
        return { canInvest: false, reason: `${lvl.requiredReferrals} filleuls requis ou $${fee.toFixed(2)} de frais` };
      }
      return { canInvest: false, reason: `${lvl.requiredReferrals} filleuls requis` };
    }

    // Check if invested in previous level
    if (!investedLevels.has(level - 1)) {
      return { canInvest: false, reason: `Investissez d'abord au Niveau ${level - 1}` };
    }

    return { canInvest: true };
  };

  const getUnlockInfo = (level: number) => {
    const lvl = INVEST_LEVELS[level - 1];
    if (!lvl) return null;
    const missingReferrals = Math.max(0, lvl.requiredReferrals - user.referralCount);
    const fee = missingReferrals * lvl.unlockFee;
    return { missingReferrals, fee, requiredReferrals: lvl.requiredReferrals, unlockFee: lvl.unlockFee };
  };

  return (
    <>
      <style>{`
        @keyframes investCardHover {
          0% { transform: translateY(0); }
          100% { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        }
        @keyframes claimBtnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); transform: scale(1); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); transform: scale(1.02); }
        }
        @keyframes balanceGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.08); }
          50% { box-shadow: 0 0 40px rgba(59,130,246,0.12); }
        }
        @keyframes timerColon {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes progressShine {
          0% { left: -30%; }
          100% { left: 130%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes lockShake {
          0%, 100% { transform: rotate(0); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .invest-card-dark:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .invest-card-dark {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .claim-btn-pulse {
          animation: claimBtnPulse 1.5s ease-in-out infinite;
        }
        .balance-glow {
          animation: balanceGlow 3s ease-in-out infinite;
        }
        .timer-colon {
          animation: timerColon 1s step-end infinite;
        }
        .progress-shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -30%;
          width: 30%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: progressShine 2s ease-in-out infinite;
        }
        .lock-icon-shake:hover {
          animation: lockShake 0.3s ease-in-out;
        }
      `}</style>
      <Header title="Compte d'Investissement" icon="fa-chart-line" iconColor="#3B82F6" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none mr-1" style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.55)' }}><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0" style={{ background: '#F8F9FA' }}>

        {/* Balance Card */}
        <div className="balance-glow rounded-2xl p-5 mb-4 relative overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full" style={{ background: 'rgba(59,130,246,0.06)' }}></div>
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full" style={{ background: 'rgba(59,130,246,0.03)' }}></div>
          <div className="absolute top-3 right-4 text-[0.65rem] font-mono" style={{ color: 'rgba(0,0,0,0.2)' }}>INVEST·HUB</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <i className="fas fa-chart-line text-[0.85rem]" style={{ color: '#3B82F6' }}></i>
            </div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[1.5px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Solde Investissement</div>
          </div>
          <div className="text-[2rem] font-black mb-2 tracking-tight" style={{ color: '#22C55E' }}>{formatMoney(user.investBalance)}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => useAppStore.getState().setPage('wallet')} className="flex items-center gap-1.5 text-[0.75rem] font-semibold py-1.5 px-3 rounded-lg transition-colors" style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <i className="fas fa-plus text-[0.65rem]"></i>Verser des fonds
            </button>
          </div>
        </div>

        {/* Claimable alert */}
        {activeInv.some(i => i.canClaim) && (
          <div className="rounded-xl p-3.5 mb-4 flex items-center gap-3 relative overflow-hidden" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)', animation: 'slideUp 0.3s ease-out' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.15)', boxShadow: '0 4px 12px rgba(34,197,94,0.15)' }}>
              <i className="fas fa-gift text-[1rem]" style={{ color: '#22C55E' }}></i>
            </div>
            <div className="flex-1">
              <h4 className="text-[0.85rem] font-bold" style={{ color: '#22C55E' }}>Gains à réclamer !</h4>
              <p className="text-[0.72rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>Vous avez des gains prêts à être collectés.</p>
            </div>
            <i className="fas fa-chevron-right text-[0.7rem]" style={{ color: 'rgba(34,197,94,0.4)' }}></i>
          </div>
        )}

        {/* Investment Levels by Category */}
        {['petit', 'gros'].map(cat => {
          const catLevels = INVEST_LEVELS.filter(l => l.category === cat);
          if (catLevels.length === 0) return null;
          return (
            <div key={cat} className="mb-5">
              <h3 className="text-[0.88rem] font-bold mb-2.5" style={{ color: '#1F2937' }}>
                {cat === 'petit' ? '🌱 Petit Investissement' : '💎 Gros Investissement'}
              </h3>
              <div className="space-y-2.5">
          {catLevels.map((lvl) => {
            const isUnlocked = lvl.level <= unlockedLevel;
            const hasPrevLevel = lvl.level === 1 || investedLevels.has(lvl.level - 1);
            const canInvest = isUnlocked && hasPrevLevel;
            const unlockInfo = getUnlockInfo(lvl.level);

            return (
              <div
                key={lvl.level}
                className="rounded-xl overflow-hidden relative"
                style={{
                  background: canInvest ? '#FFFFFF' : '#F3F4F6',
                  border: `1px solid ${canInvest ? hexToRgba(lvl.color, 0.2) : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: canInvest ? hexToRgba(lvl.color, 0.12) : 'rgba(0,0,0,0.06)' }}>
                        <i className={`fas ${isUnlocked ? lvl.icon : 'fa-lock'} text-[0.85rem]`} style={{ color: canInvest ? lvl.color : 'rgba(0,0,0,0.3)' }}></i>
                      </div>
                      <div>
                        <div className="text-[0.88rem] font-bold" style={{ color: canInvest ? '#1F2937' : 'rgba(0,0,0,0.4)' }}>
                          Niv. {lvl.level} — {lvl.name}
                        </div>
                        <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>
                          ${lvl.min} - ${lvl.max} · {lvl.rate}%/jour · Illimité
                        </div>
                      </div>
                    </div>
                    {canInvest ? (
                      <button
                        onClick={() => { setShowCreate(lvl.level); setCreateAmt(''); }}
                        className="py-2 px-4 rounded-xl text-[0.75rem] font-bold border-none cursor-pointer transition-all active:scale-[0.97]"
                        style={{ background: lvl.color, color: '#FFFFFF', boxShadow: `0 2px 8px ${hexToRgba(lvl.color, 0.25)}` }}
                      >
                        Investir
                      </button>
                    ) : !isUnlocked ? (
                      <button
                        onClick={() => setUnlockLevel(lvl.level)}
                        className="py-2 px-3 rounded-xl text-[0.7rem] font-semibold border-none cursor-pointer transition-all active:scale-[0.97]"
                        style={{ background: hexToRgba(lvl.color, 0.1), color: lvl.color, border: `1px solid ${hexToRgba(lvl.color, 0.2)}` }}
                      >
                        <i className="fas fa-lock-open text-[0.6rem] mr-1"></i>Débloquer
                      </button>
                    ) : (
                      <span className="text-[0.65rem] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.4)' }}>
                        <i className="fas fa-arrow-up text-[0.55rem] mr-1"></i>Niv. {lvl.level - 1} requis
                      </span>
                    )}
                  </div>

                  {/* Level info row */}
                  <div className="flex items-center gap-3 text-[0.62rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>
                    <span className="flex items-center gap-1">
                      <i className="fas fa-coins text-[0.5rem]"></i>
                      Rendement: Illimité
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fas fa-chart-line text-[0.5rem]"></i>
                      Profit: Illimité
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fas fa-infinity text-[0.5rem]"></i>
                      Durée illimitée
                    </span>
                    {lvl.requiredReferrals > 0 && (
                      <span className="flex items-center gap-1" style={{ color: isUnlocked ? '#22C55E' : 'rgba(0,0,0,0.5)' }}>
                        <i className="fas fa-users text-[0.5rem]"></i>
                        {lvl.requiredReferrals} filleuls
                        {isUnlocked && <i className="fas fa-check text-[0.5rem] ml-0.5"></i>}
                      </span>
                    )}
                    {lvl.level === 1 && (
                      <span className="flex items-center gap-1" style={{ color: '#22C55E' }}>
                        <i className="fas fa-unlock text-[0.5rem]"></i>Libre
                      </span>
                    )}
                  </div>
                </div>

                {/* Locked overlay strip */}
                {!isUnlocked && (
                  <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.03)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <i className="fas fa-lock text-[0.55rem]" style={{ color: 'rgba(0,0,0,0.25)' }}></i>
                    <span className="text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.4)' }}>
                      {lvl.requiredReferrals} filleuls actifs requis ou {lvl.unlockFee}$/filleul manquant
                    </span>
                  </div>
                )}
              </div>
            );
          })}
              </div>
            </div>
          );
        })}

        {/* Active Investments */}
        {activeInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold mb-2.5" style={{ color: '#1F2937' }}>Investissements actifs</h3>
            {activeInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              const nextMs = inv.nextClaimAt ? new Date(inv.nextClaimAt).getTime() - now : 0;
              const canClaim = inv.canClaim || nextMs <= 0;
              const hours = Math.max(0, Math.floor(nextMs / 3600000));
              const mins = Math.max(0, Math.floor((nextMs % 3600000) / 60000));
              const secs = Math.max(0, Math.floor((nextMs % 60000) / 1000));
              const progress = (inv.doneCycles / inv.totalCycles) * 100;
              return (
                <div key={inv.id} className="rounded-xl p-4 mb-2.5" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', animation: 'slideUp 0.3s ease-out' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[0.85rem]" style={{ background: hexToRgba(lvl.color, 0.12), color: lvl.color }}>
                        <i className={`fas ${lvl.icon}`}></i>
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-bold" style={{ color: '#1F2937' }}>Niv. {inv.level} - {lvl.name}</div>
                        <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>{formatMoney(inv.amount)} · {inv.rate}%/jour</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.6rem] uppercase tracking-[0.5px]" style={{ color: 'rgba(0,0,0,0.35)' }}>Gagné</div>
                      <div className="text-[0.95rem] font-black" style={{ color: '#22C55E' }}>+{formatMoney(inv.earned)}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-[6px] rounded-full mb-2.5 relative overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <div className="h-full rounded-full relative progress-shine transition-all duration-500" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${lvl.color}, #22C55E)` }}></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-medium" style={{ color: 'rgba(0,0,0,0.45)' }}>{inv.doneCycles} collectes · Illimité</span>
                    {canClaim ? (
                      <div className="flex items-center gap-2">
                        {(user as any).investClaimBlocked && (
                          <button onClick={() => handleClaim(inv.id, true)} className="py-2 px-3 rounded-xl text-[0.7rem] font-bold border-none cursor-pointer transition-all active:scale-[0.97]" style={{ background: '#F59E0B', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }}>
                            <i className="fas fa-coins text-[0.6rem] mr-1"></i>Payer
                          </button>
                        )}
                        <button onClick={() => handleClaim(inv.id, false)} className="claim-btn-pulse py-2 px-4 rounded-xl text-[0.78rem] font-bold border-none cursor-pointer flex items-center gap-1.5 transition-all active:scale-[0.97]" style={{ background: '#22C55E', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}>
                          <i className="fas fa-hand-holding-dollar text-[0.7rem]"></i>Réclamer
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 py-1.5 px-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <i className="fas fa-clock text-[0.55rem]" style={{ color: 'rgba(0,0,0,0.35)' }}></i>
                        <span className="text-[0.78rem] font-mono font-bold" style={{ color: 'rgba(0,0,0,0.65)' }}>
                          {hours}<span className="timer-colon">:</span>{mins.toString().padStart(2,'0')}<span className="timer-colon">:</span>{secs.toString().padStart(2,'0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Completed Investments */}
        {completedInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold mb-2.5 mt-4" style={{ color: '#1F2937' }}>Terminés</h3>
            {completedInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              return (
                <div key={inv.id} className="rounded-xl p-3 mb-2" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.1) }}>
                        <i className={`fas ${lvl.icon} text-[0.55rem]`} style={{ color: lvl.color }}></i>
                      </div>
                      <div className="text-[0.75rem] font-semibold" style={{ color: '#1F2937' }}>Niv. {inv.level} - {lvl.name}</div>
                    </div>
                    <div className="text-[0.75rem] font-bold" style={{ color: lvl.color }}>+{formatMoney(inv.earned)}</div>
                  </div>
                  <div className="text-[0.6rem] ml-8" style={{ color: 'rgba(0,0,0,0.35)' }}>{formatMoney(inv.amount)} investi · {inv.totalCycles} jours</div>
                </div>
              );
            })}
          </>
        )}

        {/* Empty state */}
        {investments.length === 0 && !loading && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,0,0,0.04)' }}>
              <i className="fas fa-chart-line text-[1.5rem]" style={{ color: 'rgba(0,0,0,0.15)' }}></i>
            </div>
            <p className="text-[0.85rem] font-medium" style={{ color: 'rgba(0,0,0,0.55)' }}>Aucun investissement</p>
            <p className="text-[0.72rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Choisissez un niveau pour commencer !</p>
          </div>
        )}
      </div>

      {/* Create Investment Modal */}
      {showCreate && (() => {
        const lvl = INVEST_LEVELS[showCreate - 1];
        if (!lvl) return null;
        const totalReturn = lvl.totalReturn || (lvl.rate * lvl.cycles);
        const profitPct = lvl.profit || (lvl.rate * lvl.cycles);
        return (
          <div className="fixed inset-0 backdrop-blur-sm z-[6000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowCreate(null)}>
            <div className="rounded-2xl p-6 w-[88%] max-w-[340px]" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', animation: 'modalIn 0.25s ease-out' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.12) }}>
                  <i className={`fas ${lvl.icon}`} style={{ color: lvl.color }}></i>
                </div>
                <div>
                  <h3 className="text-[1rem] font-bold" style={{ color: '#1F2937' }}>Niveau {lvl.level} — {lvl.name}</h3>
                  <p className="text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>${lvl.min}-${lvl.max} · {lvl.rate}%/jour · Illimité</p>
                </div>
              </div>

              {/* Return info */}
              <div className="rounded-lg p-3 mb-3" style={{ background: hexToRgba(lvl.color, 0.08), border: `1px solid ${hexToRgba(lvl.color, 0.1)}` }}>
                <div className="text-[0.68rem] mb-1" style={{ color: '#22C55E' }}>
                  <i className="fas fa-calculator mr-1"></i>Rendement: <span className="font-bold">Illimité</span> · Profit: <span className="font-bold">Illimité</span>
                </div>
                <div className="text-[0.62rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>
                  Gain/jour: {lvl.rate}% du dépôt · Durée illimitée · Collecte quotidienne
                </div>
              </div>

              {/* Potential gain calculator */}
              {createAmt && parseFloat(createAmt) >= lvl.min && (
                <div className="rounded-lg p-2.5 mb-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
                  <div className="text-[0.65rem] font-semibold" style={{ color: '#22C55E' }}>
                    Gain quotidien: +{formatMoney(parseFloat(createAmt) * lvl.rate / 100)}
                  </div>
                  <div className="text-[0.62rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>
                    Gains illimités tant que l'investissement est actif
                  </div>
                </div>
              )}

              <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant ($${lvl.min} - $${lvl.max})`} className="w-full py-3 px-4 rounded-xl text-[0.88rem] outline-none mb-4 transition-colors" style={{ background: 'rgba(0,0,0,0.05)', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1F2937' }} onFocus={(e) => { e.target.style.borderColor = hexToRgba(lvl.color, 0.4); }} onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }} />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-colors" style={{ background: 'rgba(0,0,0,0.05)', border: '1.5px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.55)' }}>Annuler</button>
                <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.97]" style={{ background: lvl.color, color: '#FFFFFF', boxShadow: `0 4px 16px ${hexToRgba(lvl.color, 0.25)}` }}>{creating ? '...' : 'Investir'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unlock Level Modal */}
      {unlockLevel && (() => {
        const lvl = INVEST_LEVELS[unlockLevel - 1];
        if (!lvl) return null;
        const info = getUnlockInfo(unlockLevel);
        if (!info) return null;
        const canUnlockFree = info.missingReferrals <= 0;
        return (
          <div className="fixed inset-0 backdrop-blur-sm z-[6000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setUnlockLevel(null)}>
            <div className="rounded-2xl p-6 w-[88%] max-w-[340px]" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', animation: 'modalIn 0.25s ease-out' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.12) }}>
                  <i className="fas fa-lock-open" style={{ color: lvl.color }}></i>
                </div>
                <div>
                  <h3 className="text-[1rem] font-bold" style={{ color: '#1F2937' }}>Débloquer Niveau {lvl.level}</h3>
                  <p className="text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>{lvl.name} · {lvl.rate}%/jour · {lvl.cycles} jours</p>
                </div>
              </div>

              {/* Requirements */}
              <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="text-[0.72rem] font-semibold mb-2" style={{ color: '#1F2937' }}>Conditions de déblocage</div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.68rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>Filleuls requis</span>
                  <span className="text-[0.68rem] font-bold" style={{ color: canUnlockFree ? '#22C55E' : '#1F2937' }}>
                    {user.referralCount}/{info.requiredReferrals}
                    {canUnlockFree && <i className="fas fa-check text-[0.55rem] ml-1"></i>}
                  </span>
                </div>
                {info.missingReferrals > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[0.68rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>Filleuls manquants</span>
                      <span className="text-[0.68rem] font-bold" style={{ color: '#F59E0B' }}>{info.missingReferrals}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[0.68rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>Frais par filleul manquant</span>
                      <span className="text-[0.68rem] font-bold" style={{ color: '#1F2937' }}>${info.unlockFee}</span>
                    </div>
                    <div className="border-t mt-2 pt-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[0.72rem] font-bold" style={{ color: '#1F2937' }}>Frais totaux</span>
                        <span className="text-[0.82rem] font-black" style={{ color: '#F59E0B' }}>${info.fee.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-1.5 text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.4)' }}>
                      Solde principal: {formatMoney(user.balance)}
                    </div>
                  </>
                )}
              </div>

              {/* Level info */}
              <div className="rounded-lg p-2.5 mb-4" style={{ background: hexToRgba(lvl.color, 0.06), border: `1px solid ${hexToRgba(lvl.color, 0.1)}` }}>
                <div className="text-[0.62rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>
                  <i className="fas fa-info-circle mr-1"></i>
                  Niveau {lvl.level}: ${lvl.min}-${lvl.max} · {lvl.rate}%/jour · Gains illimités · Collecte quotidienne
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setUnlockLevel(null)} className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-colors" style={{ background: 'rgba(0,0,0,0.05)', border: '1.5px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.55)' }}>Annuler</button>
                <button
                  onClick={() => handleUnlock(unlockLevel)}
                  disabled={unlocking || (!canUnlockFree && user.balance < info.fee)}
                  className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.97]"
                  style={{ background: lvl.color, color: '#FFFFFF', boxShadow: `0 4px 16px ${hexToRgba(lvl.color, 0.25)}` }}
                >
                  {unlocking ? '...' : canUnlockFree ? 'Débloquer gratuitement' : `Payer $${info.fee.toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
