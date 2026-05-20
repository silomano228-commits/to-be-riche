'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
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
      `}</style>
      <Header title="Compte d'Investissement" icon="fa-chart-line" iconColor="#3B82F6" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none mr-1" style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.55)' }}><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0" style={{ background: '#F8F9FA' }}>

        {/* Balance Card — clean white with gold accent */}
        <div
          className="balance-glow rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {/* Decorative subtle elements */}
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
            <button
              onClick={() => useAppStore.getState().setPage('wallet')}
              className="flex items-center gap-1.5 text-[0.75rem] font-semibold py-1.5 px-3 rounded-lg transition-colors"
              style={{
                color: '#3B82F6',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.15)',
              }}
            >
              <i className="fas fa-plus text-[0.65rem]"></i>Verser des fonds
            </button>
          </div>
        </div>

        {/* Claimable alert — with gold accent */}
        {activeInv.some(i => i.canClaim) && (
          <div
            className="rounded-xl p-3.5 mb-4 flex items-center gap-3 relative overflow-hidden"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.15)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(34,197,94,0.15)',
                boxShadow: '0 4px 12px rgba(34,197,94,0.15)',
              }}
            >
              <i className="fas fa-gift text-[1rem]" style={{ color: '#22C55E' }}></i>
            </div>
            <div className="flex-1">
              <h4 className="text-[0.85rem] font-bold" style={{ color: '#22C55E' }}>Gains à réclamer !</h4>
              <p className="text-[0.72rem]" style={{ color: 'rgba(0,0,0,0.55)' }}>Vous avez des gains prêts à être collectés.</p>
            </div>
            <i className="fas fa-chevron-right text-[0.7rem]" style={{ color: 'rgba(34,197,94,0.4)' }}></i>
          </div>
        )}

        {/* Investment Levels — light cards with gold accents */}
        <h3 className="text-[0.88rem] font-bold mb-2.5" style={{ color: '#1F2937' }}>Niveaux d&apos;investissement</h3>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {INVEST_LEVELS.map((lvl) => (
            <button
              key={lvl.level}
              onClick={() => setShowCreate(lvl.level)}
              className="invest-card-dark rounded-xl p-4 text-left cursor-pointer active:scale-[0.97] relative overflow-hidden group"
              style={{
                background: '#F3F4F6',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.12) }}>
                  <i className={`fas ${lvl.icon} text-[0.75rem]`} style={{ color: lvl.color }}></i>
                </div>
                <span className="text-[0.72rem] font-bold" style={{ color: lvl.color }}>Niv. {lvl.level}</span>
              </div>
              <div className="text-[0.88rem] font-bold mb-0.5" style={{ color: '#1F2937' }}>{lvl.name}</div>
              <div className="text-[0.65rem] mb-1" style={{ color: 'rgba(0,0,0,0.45)' }}>{lvl.min}-{lvl.max} $</div>
              <div className="flex items-center gap-1">
                <span
                  className="text-[0.68rem] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: hexToRgba(lvl.color, 0.1), color: lvl.color }}
                >
                  {lvl.rate}%/cycle
                </span>
                <span className="text-[0.62rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>· {lvl.cycles}j</span>
              </div>
            </button>
          ))}
        </div>

        {/* Active Investments — white cards with gold progress bars */}
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
                <div
                  key={inv.id}
                  className="rounded-xl p-4 mb-2.5"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,0,0,0.08)',
                    animation: 'slideUp 0.3s ease-out',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[0.85rem]"
                        style={{ background: hexToRgba(lvl.color, 0.12), color: lvl.color }}
                      >
                        <i className={`fas ${lvl.icon}`}></i>
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-bold" style={{ color: '#1F2937' }}>Niv. {inv.level} - {lvl.name}</div>
                        <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>{formatMoney(inv.amount)} · {inv.rate}%/cycle</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.6rem] uppercase tracking-[0.5px]" style={{ color: 'rgba(0,0,0,0.35)' }}>Gagné</div>
                      <div className="text-[0.95rem] font-black" style={{ color: '#22C55E' }}>+{formatMoney(inv.earned)}</div>
                    </div>
                  </div>

                  {/* Progress bar — gold gradient on light track */}
                  <div className="w-full h-[6px] rounded-full mb-2.5 relative overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <div
                      className="h-full rounded-full relative progress-shine transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${lvl.color}, #22C55E)`,
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-medium" style={{ color: 'rgba(0,0,0,0.45)' }}>{inv.doneCycles}/{inv.totalCycles} cycles</span>
                    {canClaim ? (
                      <button
                        onClick={() => handleClaim(inv.id)}
                        className="claim-btn-pulse py-2 px-4 rounded-xl text-[0.78rem] font-bold border-none cursor-pointer flex items-center gap-1.5 transition-all active:scale-[0.97]"
                        style={{
                          background: '#22C55E',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
                        }}
                      >
                        <i className="fas fa-hand-holding-dollar text-[0.7rem]"></i>Réclamer
                      </button>
                    ) : (
                      <div
                        className="flex items-center gap-1 py-1.5 px-3 rounded-lg"
                        style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)' }}
                      >
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

        {/* Completed Investments — subtle light cards */}
        {completedInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold mb-2.5 mt-4" style={{ color: '#1F2937' }}>Terminés</h3>
            {completedInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              return (
                <div
                  key={inv.id}
                  className="rounded-xl p-3 mb-2"
                  style={{
                    background: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: hexToRgba(lvl.color, 0.1) }}>
                        <i className={`fas ${lvl.icon} text-[0.55rem]`} style={{ color: lvl.color }}></i>
                      </div>
                      <div className="text-[0.75rem] font-semibold" style={{ color: '#1F2937' }}>Niv. {inv.level} - {lvl.name}</div>
                    </div>
                    <div className="text-[0.75rem] font-bold" style={{ color: lvl.color }}>+{formatMoney(inv.earned)}</div>
                  </div>
                  <div className="text-[0.6rem] ml-8" style={{ color: 'rgba(0,0,0,0.35)' }}>{formatMoney(inv.amount)} investi · {inv.totalCycles} cycles</div>
                </div>
              );
            })}
          </>
        )}

        {/* Empty state */}
        {investments.length === 0 && !loading && (
          <div className="text-center py-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,0,0,0.04)' }}
            >
              <i className="fas fa-chart-line text-[1.5rem]" style={{ color: 'rgba(0,0,0,0.15)' }}></i>
            </div>
            <p className="text-[0.85rem] font-medium" style={{ color: 'rgba(0,0,0,0.55)' }}>Aucun investissement</p>
            <p className="text-[0.72rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Choisissez un niveau pour commencer !</p>
          </div>
        )}
      </div>

      {/* Create Investment Modal — light bg, gold button */}
      {showCreate && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[6000] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setShowCreate(null)}
        >
          <div
            className="rounded-2xl p-6 w-[88%] max-w-[340px]"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              animation: 'modalIn 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const lvl = INVEST_LEVELS[showCreate - 1];
              return (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: hexToRgba(lvl.color, 0.12) }}
                    >
                      <i className={`fas ${lvl.icon}`} style={{ color: lvl.color }}></i>
                    </div>
                    <div>
                      <h3 className="text-[1rem] font-bold" style={{ color: '#1F2937' }}>Niveau {lvl.level} - {lvl.name}</h3>
                      <p className="text-[0.7rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>{lvl.min}-{lvl.max} $ · {lvl.rate}%/cycle · {lvl.cycles} cycles</p>
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-3 mb-4"
                    style={{
                      background: hexToRgba(lvl.color, 0.08),
                      border: `1px solid ${hexToRgba(lvl.color, 0.1)}`,
                    }}
                  >
                    <div className="text-[0.68rem]" style={{ color: '#22C55E' }}>
                      <i className="fas fa-calculator mr-1"></i>Gain potentiel max: <span className="font-bold">{formatMoney(lvl.max * lvl.rate / 100 * lvl.cycles)}</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={createAmt}
                    onChange={(e) => setCreateAmt(e.target.value)}
                    placeholder={`Montant (${lvl.min}-${lvl.max} $)`}
                    className="w-full py-3 px-4 rounded-xl text-[0.88rem] outline-none mb-4 transition-colors"
                    style={{
                      background: 'rgba(0,0,0,0.05)',
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      color: '#1F2937',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = hexToRgba(lvl.color, 0.4); }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreate(null)}
                      className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-colors"
                      style={{
                        background: 'rgba(0,0,0,0.05)',
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        color: 'rgba(0,0,0,0.55)',
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleCreate(showCreate)}
                      disabled={creating}
                      className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.97]"
                      style={{
                        background: lvl.color,
                        color: '#FFFFFF',
                        boxShadow: `0 4px 16px ${hexToRgba(lvl.color, 0.25)}`,
                      }}
                    >
                      {creating ? '...' : 'Investir'}
                    </button>
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
