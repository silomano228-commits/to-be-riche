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
      <Header title="Compte d'Investissement" icon="fa-chart-line" iconColor="#FBBF24" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Balance */}
        <div className="bg-gradient-to-br from-[#064E3B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 border border-[rgba(0,200,83,0.15)]">
          <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px] mb-1">Solde Compte d&apos;Investissement</div>
          <div className="text-[1.8rem] font-black text-[#86EFAC] mb-2">{formatMoney(user.investBalance)}</div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="text-[0.72rem] text-[#86EFAC] font-semibold"><i className="fas fa-plus mr-1"></i>Verser des fonds</button>
        </div>

        {/* Claimable alert */}
        {activeInv.some(i => i.canClaim) && (
          <div className="bg-[#F0FDF4] rounded-xl p-3.5 mb-4 flex items-center gap-3 border border-[#86EFAC]" style={{ animation: 'pulse 2s infinite' }}>
            <div className="w-10 h-10 rounded-xl bg-[#00C853] flex items-center justify-center shrink-0"><i className="fas fa-gift text-white text-[1rem]"></i></div>
            <div className="flex-1"><h4 className="text-[0.82rem] font-bold text-[#166534]">Gains à réclamer !</h4><p className="text-[0.72rem] text-[#15803D]">Vous avez des gains prêts à être collectés.</p></div>
          </div>
        )}

        {/* Investment Levels */}
        <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Niveaux d&apos;investissement</h3>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {INVEST_LEVELS.map((lvl) => (
            <button key={lvl.level} onClick={() => setShowCreate(lvl.level)} className={`${lvl.bg} rounded-xl p-3.5 text-left border ${lvl.border} cursor-pointer transition-transform active:scale-95`}>
              <div className="flex items-center gap-1.5 mb-1.5"><i className={`fas ${lvl.icon} text-[0.8rem]`} style={{ color: lvl.color }}></i><span className="text-[0.72rem] font-bold" style={{ color: lvl.color }}>Niv. {lvl.level}</span></div>
              <div className="text-[0.82rem] font-bold text-[#1A2332]">{lvl.name}</div>
              <div className="text-[0.65rem] text-[#64748B]">{lvl.min}-{lvl.max} $</div>
              <div className="text-[0.65rem] font-semibold" style={{ color: lvl.color }}>{lvl.rate}%/cycle · {lvl.cycles}j</div>
            </button>
          ))}
        </div>

        {/* Active Investments */}
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
                <div key={inv.id} className="bg-white rounded-xl p-4 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.7rem]" style={{ backgroundColor: lvl.color + '20', color: lvl.color }}><i className={`fas ${lvl.icon}`}></i></div><div><div className="text-[0.8rem] font-bold text-[#1A2332]">Niv. {inv.level} - {lvl.name}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(inv.amount)} · {inv.rate}%/cycle</div></div></div>
                    <div className="text-right"><div className="text-[0.65rem] text-[#94A3B8]">Gagné</div><div className="text-[0.82rem] font-bold text-[#00C853]">{formatMoney(inv.earned)}</div></div>
                  </div>
                  <div className="w-full h-[6px] bg-[#F1F5F9] rounded-full mb-2"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: lvl.color }}></div></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-[#64748B]">{inv.doneCycles}/{inv.totalCycles} cycles</span>
                    {canClaim ? (
                      <button onClick={() => handleClaim(inv.id)} className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#00E676] to-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer" style={{ animation: 'pulse 2s infinite' }}>Réclamer</button>
                    ) : (
                      <span className="text-[0.65rem] font-mono text-[#64748B]">{hours}h {mins}m {secs}s</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Completed */}
        {completedInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5 mt-4">Terminés</h3>
            {completedInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              return (
                <div key={inv.id} className="bg-[#F8FAFC] rounded-xl p-3 mb-2 border border-[rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between"><div className="text-[0.75rem] font-semibold text-[#1A2332]">Niv. {inv.level} - {lvl.name}</div><div className="text-[0.75rem] font-bold text-[#00C853]">+{formatMoney(inv.earned)}</div></div>
                  <div className="text-[0.6rem] text-[#94A3B8]">{formatMoney(inv.amount)} investi · {inv.totalCycles} cycles</div>
                </div>
              );
            })}
          </>
        )}

        {investments.length === 0 && !loading && (
          <div className="text-center py-8"><i className="fas fa-chart-line text-[2rem] text-[#CBD5E1] mb-3"></i><p className="text-[0.82rem] text-[#94A3B8]">Aucun investissement. Choisissez un niveau pour commencer !</p></div>
        )}
      </div>

      {/* Create Investment Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowCreate(null)}>
          <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[320px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const lvl = INVEST_LEVELS[showCreate - 1];
              return (
                <>
                  <div className="flex items-center gap-2 mb-1"><i className={`fas ${lvl.icon}`} style={{ color: lvl.color }}></i><h3 className="text-[1rem] font-bold text-[#1A2332]">Niveau {lvl.level} - {lvl.name}</h3></div>
                  <p className="text-[0.75rem] text-[#64748B] mb-1">{lvl.min}-{lvl.max} $ · {lvl.rate}%/cycle · {lvl.cycles} cycles</p>
                  <p className="text-[0.68rem] text-[#94A3B8] mb-4">Gain potentiel: {formatMoney(lvl.max * lvl.rate / 100 * lvl.cycles)}</p>
                  <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant (${lvl.min}-${lvl.max} $)`} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#00C853]" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer">Annuler</button>
                    <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60">{creating ? '...' : 'Investir'}</button>
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
