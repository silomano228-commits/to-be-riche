'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function InvestHubScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState<number | null>(null);
  const [createAmt, setCreateAmt] = useState('');
  const [creating, setCreating] = useState(false);
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

  const refreshUser = async () => { try { const r = await fetch('/api/auth/session'); const d = await r.json(); if (d.success) setUser(d.user); } catch { /* */ } };

  const handleCreate = async (level: number) => {
    const amt = parseFloat(createAmt);
    const lvl = INVEST_LEVELS[level - 1];
    if (!amt || amt < lvl.min || amt > lvl.max) { addToast(`Montant: ${lvl.min}-${lvl.max} $`, 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/invest/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level, amount: amt }) });
      const data = await res.json();
      if (data.success) { addToast('Investissement créé !', 'success'); setShowCreate(null); setCreateAmt(''); loadInvestments(); refreshUser(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  const handleClaim = async (id: string) => {
    try {
      const res = await authFetch('/api/invest/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ investmentId: id }) });
      const data = await res.json();
      if (data.success) { addToast('Gain réclamé ! +' + formatMoney(data.claimedAmount), 'success'); loadInvestments(); refreshUser(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
  };

  if (!user) return null;

  const activeInv = investments.filter(i => i.status === 'active');
  const completedInv = investments.filter(i => i.status === 'completed');

  return (
    <>
      <style>{`
        @keyframes investCardHover {
          0% { transform: translateY(0); box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
          100% { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        }
        @keyframes claimBtnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.5); transform: scale(1); }
          50% { box-shadow: 0 0 0 10px rgba(0, 200, 83, 0); transform: scale(1.03); }
        }
        @keyframes balanceGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(134, 239, 172, 0.1); }
          50% { box-shadow: 0 0 40px rgba(134, 239, 172, 0.2); }
        }
        @keyframes timerColon {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes progressShine {
          0% { left: -30%; }
          100% { left: 130%; }
        }
        .invest-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .invest-card-hover {
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
      `}</style>
      <Header title="Compte d'Investissement" icon="fa-chart-line" iconColor="#FBBF24" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Balance - Enhanced */}
        <div className="balance-glow bg-gradient-to-br from-[#064E3B] via-[#0A3D2E] to-[#0F172A] text-white rounded-2xl p-5 mb-4 border border-[rgba(0,200,83,0.15)] relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-[rgba(134,239,172,0.06)]"></div>
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-[rgba(0,200,83,0.04)]"></div>
          <div className="absolute top-3 right-4 text-[0.65rem] opacity-30 font-mono">INVEST·HUB</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[rgba(134,239,172,0.15)] flex items-center justify-center">
              <i className="fas fa-chart-line text-[0.85rem] text-[#86EFAC]"></i>
            </div>
            <div className="text-[0.7rem] opacity-50 font-semibold uppercase tracking-[1.5px]">Solde Investissement</div>
          </div>
          <div className="text-[2rem] font-black text-[#86EFAC] mb-2 tracking-tight">{formatMoney(user.investBalance)}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => useAppStore.getState().setPage('wallet')} className="flex items-center gap-1.5 text-[0.75rem] text-[#86EFAC] font-semibold bg-[rgba(134,239,172,0.1)] hover:bg-[rgba(134,239,172,0.2)] transition-colors py-1.5 px-3 rounded-lg border border-[rgba(134,239,172,0.15)]">
              <i className="fas fa-plus text-[0.65rem]"></i>Verser des fonds
            </button>
          </div>
        </div>

        {/* Claimable alert - Enhanced */}
        {activeInv.some(i => i.canClaim) && (
          <div className="bg-[#F0FDF4] rounded-xl p-3.5 mb-4 flex items-center gap-3 border border-[#86EFAC] relative overflow-hidden" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,200,83,0.05)] to-transparent pointer-events-none"></div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00C853] to-[#00E676] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,200,83,0.25)]"><i className="fas fa-gift text-white text-[1rem]"></i></div>
            <div className="flex-1"><h4 className="text-[0.85rem] font-bold text-[#166534]">Gains à réclamer !</h4><p className="text-[0.72rem] text-[#15803D]">Vous avez des gains prêts à être collectés.</p></div>
            <i className="fas fa-chevron-right text-[#86EFAC] text-[0.7rem]"></i>
          </div>
        )}

        {/* Investment Levels - Enhanced with hover */}
        <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Niveaux d&apos;investissement</h3>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {INVEST_LEVELS.map((lvl) => (
            <button key={lvl.level} onClick={() => setShowCreate(lvl.level)} className={`invest-card-hover ${lvl.bg} rounded-xl p-4 text-left border ${lvl.border} cursor-pointer active:scale-[0.97] relative overflow-hidden group`}>
              {/* Decorative shine on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0)] to-[rgba(255,255,255,0)] group-hover:from-[rgba(255,255,255,0.3)] group-hover:to-[rgba(255,255,255,0)] transition-all duration-300 pointer-events-none"></div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: lvl.color + '20' }}>
                  <i className={`fas ${lvl.icon} text-[0.75rem]`} style={{ color: lvl.color }}></i>
                </div>
                <span className="text-[0.72rem] font-bold" style={{ color: lvl.color }}>Niv. {lvl.level}</span>
              </div>
              <div className="text-[0.88rem] font-bold text-[#1A2332] mb-0.5">{lvl.name}</div>
              <div className="text-[0.65rem] text-[#64748B] mb-1">{lvl.min}-{lvl.max} $</div>
              <div className="flex items-center gap-1">
                <span className="text-[0.68rem] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: lvl.color + '15', color: lvl.color }}>{lvl.rate}%/cycle</span>
                <span className="text-[0.62rem] text-[#94A3B8]">· {lvl.cycles}j</span>
              </div>
            </button>
          ))}
        </div>

        {/* Active Investments - Enhanced */}
        {activeInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Investissements actifs</h3>
            {activeInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              const nextMs = inv.nextClaimAt ? new Date(inv.nextClaimAt).getTime() - now : 0;
              const canClaim = inv.canClaim || nextMs <= 0;
              const hours = Math.max(0, Math.floor(nextMs / 3600000));
              const mins = Math.max(0, Math.floor((nextMs % 3600000) / 60000));
              const secs = Math.max(0, Math.floor((nextMs % 60000) / 1000));
              const progress = (inv.doneCycles / inv.totalCycles) * 100;
              return (
                <div key={inv.id} className="bg-white rounded-xl p-4 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]" style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[0.85rem]" style={{ backgroundColor: lvl.color + '15', color: lvl.color }}>
                        <i className={`fas ${lvl.icon}`}></i>
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-bold text-[#1A2332]">Niv. {inv.level} - {lvl.name}</div>
                        <div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(inv.amount)} · {inv.rate}%/cycle</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.6rem] text-[#94A3B8] uppercase tracking-[0.5px]">Gagné</div>
                      <div className="text-[0.95rem] font-black text-[#00C853]">+{formatMoney(inv.earned)}</div>
                    </div>
                  </div>
                  {/* Progress bar with gradient and shine */}
                  <div className="w-full h-[8px] bg-[#F1F5F9] rounded-full mb-2.5 relative overflow-hidden">
                    <div className="h-full rounded-full relative progress-shine transition-all duration-500" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${lvl.color}CC, ${lvl.color})` }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-[#64748B] font-medium">{inv.doneCycles}/{inv.totalCycles} cycles</span>
                    {canClaim ? (
                      <button onClick={() => handleClaim(inv.id)} className="claim-btn-pulse py-2 px-4 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white text-[0.78rem] font-bold border-none cursor-pointer flex items-center gap-1.5">
                        <i className="fas fa-hand-holding-dollar text-[0.7rem]"></i>Réclamer
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-[#F8FAFC] py-1.5 px-3 rounded-lg border border-[rgba(0,0,0,0.04)]">
                        <i className="fas fa-clock text-[0.55rem] text-[#94A3B8]"></i>
                        <span className="text-[0.78rem] font-mono font-bold text-[#475569]">
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

        {/* Completed - Enhanced */}
        {completedInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5 mt-4">Terminés</h3>
            {completedInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              return (
                <div key={inv.id} className="bg-[#F8FAFC] rounded-xl p-3 mb-2 border border-[rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: lvl.color + '15' }}>
                        <i className={`fas ${lvl.icon} text-[0.55rem]`} style={{ color: lvl.color }}></i>
                      </div>
                      <div className="text-[0.75rem] font-semibold text-[#1A2332]">Niv. {inv.level} - {lvl.name}</div>
                    </div>
                    <div className="text-[0.75rem] font-bold text-[#00C853]">+{formatMoney(inv.earned)}</div>
                  </div>
                  <div className="text-[0.6rem] text-[#94A3B8] ml-8">{formatMoney(inv.amount)} investi · {inv.totalCycles} cycles</div>
                </div>
              );
            })}
          </>
        )}

        {investments.length === 0 && !loading && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-chart-line text-[1.5rem] text-[#CBD5E1]"></i>
            </div>
            <p className="text-[0.85rem] text-[#94A3B8] font-medium">Aucun investissement</p>
            <p className="text-[0.72rem] text-[#CBD5E1]">Choisissez un niveau pour commencer !</p>
          </div>
        )}
      </div>

      {/* Create Investment Modal - Enhanced */}
      {showCreate && (
        <div className="fixed inset-0 bg-[rgba(6,10,20,0.6)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowCreate(null)}>
          <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[340px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]" onClick={(e) => e.stopPropagation()} style={{ animation: 'modalIn 0.2s ease-out' }}>
            {(() => {
              const lvl = INVEST_LEVELS[showCreate - 1];
              return (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: lvl.color + '15' }}>
                      <i className={`fas ${lvl.icon}`} style={{ color: lvl.color }}></i>
                    </div>
                    <div>
                      <h3 className="text-[1rem] font-bold text-[#1A2332]">Niveau {lvl.level} - {lvl.name}</h3>
                      <p className="text-[0.7rem] text-[#64748B]">{lvl.min}-{lvl.max} $ · {lvl.rate}%/cycle · {lvl.cycles} cycles</p>
                    </div>
                  </div>
                  <div className="bg-[#F0FDF4] rounded-lg p-3 mb-4 border border-[#86EFAC]">
                    <div className="text-[0.68rem] text-[#15803D]"><i className="fas fa-calculator mr-1"></i>Gain potentiel max: <span className="font-bold">{formatMoney(lvl.max * lvl.rate / 100 * lvl.cycles)}</span></div>
                  </div>
                  <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant (${lvl.min}-${lvl.max} $)`} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#00C853] transition-colors" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer hover:bg-[#F8FAFC] transition-colors">Annuler</button>
                    <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60 shadow-[0_4px_16px_rgba(0,200,83,0.2)] transition-shadow hover:shadow-[0_6px_24px_rgba(0,200,83,0.3)]">{creating ? '...' : 'Investir'}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
