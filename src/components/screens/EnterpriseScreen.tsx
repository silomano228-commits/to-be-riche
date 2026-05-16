'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function EnterpriseScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState<string | null>(null);
  const [createAmt, setCreateAmt] = useState('');
  const [creating, setCreating] = useState(false);

  const loadEnterprises = useCallback(async () => {
    try {
      const res = await authFetch('/api/enterprise/list');
      const data = await res.json();
      if (data.success) setEnterprises(data.enterprises || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => { loadEnterprises(); }, 0); return () => clearTimeout(t); }, [loadEnterprises]);

  const refreshUser = async () => { try { const r = await fetch('/api/auth/session'); const d = await r.json(); if (d.success) setUser(d.user); } catch { /* */ } };

  const handleCreate = async (type: string) => {
    const amt = parseFloat(createAmt);
    const entType = ENTERPRISE_TYPES.find(e => e.type === type);
    if (!amt || amt < (entType?.minAmount || 5)) { addToast(`Minimum ${entType?.minAmount || 5} $`, 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/enterprise/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount: amt }) });
      const data = await res.json();
      if (data.success) {
        if (data.crashed) { addToast('Crash ! Le projet a échoué.', 'error'); }
        else { addToast('Projet créé !', 'success'); }
        setShowCreate(null); setCreateAmt(''); loadEnterprises(); refreshUser();
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  const handleClaim = async (id: string) => {
    try {
      const res = await authFetch('/api/enterprise/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enterpriseId: id }) });
      const data = await res.json();
      if (data.success) { addToast(`Projet réclamé ! +${formatMoney(data.totalReturn)}`, 'success'); loadEnterprises(); refreshUser(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
  };

  if (!user) return null;

  return (
    <>
      <Header title="Entreprises" icon="fa-building" iconColor="#F97316" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Balance */}
        <div className="bg-gradient-to-br from-[#7C2D12] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(249,115,22,0.15)]">
          <div className="text-[0.7rem] opacity-40 uppercase tracking-[1.5px] mb-1">Compte de Projet</div>
          <div className="text-[1.5rem] font-black text-[#FDBA74]">{formatMoney(user.projectBalance)}</div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="text-[0.72rem] text-[#FDBA74] font-semibold mt-1"><i className="fas fa-plus mr-1"></i>Verser des fonds</button>
        </div>

        {/* Risk Warning */}
        <div className="bg-[#FFFBEB] rounded-xl p-3 mb-4 flex items-start gap-2 border-l-[3px] border-[#F59E0B]">
          <i className="fas fa-exclamation-triangle text-[#D97706] mt-0.5 shrink-0 text-[0.8rem]"></i>
          <p className="text-[0.72rem] text-[#92400E]">Plus la durée est longue, plus le risque de crash augmente. Investissez prudemment !</p>
        </div>

        {/* Enterprise Types */}
        <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Types de projets</h3>
        <div className="space-y-2.5 mb-5">
          {ENTERPRISE_TYPES.map((ent) => (
            <button key={ent.type} onClick={() => setShowCreate(ent.type)} className="w-full bg-white rounded-xl p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] cursor-pointer transition-transform active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: ent.color + '15' }}><i className={`fas ${ent.icon}`} style={{ color: ent.color }}></i></div><div><div className="text-[0.82rem] font-bold text-[#1A2332]">{ent.name}</div><div className="text-[0.65rem] text-[#64748B]">{ent.days} jours · +{ent.minRet}-{ent.maxRet}%</div></div></div>
                <div className="text-right"><div className="text-[0.65rem] text-[#EF4444] font-semibold">Risque {ent.risk}</div><i className="fas fa-chevron-right text-[#CBD5E1] text-[0.65rem] mt-1"></i></div>
              </div>
            </button>
          ))}
        </div>

        {/* Active Enterprises */}
        {enterprises.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Mes entreprises</h3>
            {enterprises.map((ent) => {
              const progress = Math.min(100, (ent.daysElapsed / ent.durationDays) * 100);
              const isFinished = ent.isFinished || ent.status === 'completed';
              const isCrashed = ent.status === 'crashed';
              return (
                <div key={ent.id} className={`bg-white rounded-xl p-4 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border ${isCrashed ? 'border-[#FCA5A5]' : isFinished ? 'border-[#86EFAC]' : 'border-[rgba(0,0,0,0.03)]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="text-[0.82rem] font-bold text-[#1A2332]">{esc(ent.name)}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(ent.amount)} · {ent.durationDays}j · +{ent.minReturn}-{ent.maxReturn}%</div></div>
                    <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${isCrashed ? 'bg-[#FEE2E2] text-[#991B1B]' : isFinished ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#DBEAFE] text-[#1E40AF]'}`}>{isCrashed ? 'Crash' : isFinished ? 'Terminé' : 'En cours'}</span>
                  </div>
                  {!isCrashed && <div className="w-full h-[6px] bg-[#F1F5F9] rounded-full mb-2"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: isFinished ? '#00C853' : '#3B82F6' }}></div></div>}
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-[#64748B]">{ent.daysElapsed}/{ent.durationDays} jours</span>
                    {isFinished && ent.canClaim && (
                      <button onClick={() => handleClaim(ent.id)} className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#00E676] to-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Réclamer</button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {enterprises.length === 0 && !loading && (
          <div className="text-center py-8"><i className="fas fa-building text-[2rem] text-[#CBD5E1] mb-3"></i><p className="text-[0.82rem] text-[#94A3B8]">Aucune entreprise. Lancez votre premier projet !</p></div>
        )}
      </div>

      {/* Create Enterprise Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowCreate(null)}>
          <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[320px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const et = ENTERPRISE_TYPES.find(e => e.type === showCreate);
              if (!et) return null;
              return (
                <>
                  <div className="flex items-center gap-2 mb-1"><i className={`fas ${et.icon}`} style={{ color: et.color }}></i><h3 className="text-[1rem] font-bold text-[#1A2332]">{et.name}</h3></div>
                  <p className="text-[0.75rem] text-[#64748B] mb-1">{et.days} jours · +{et.minRet}-{et.maxReturn}%</p>
                  <p className="text-[0.68rem] text-[#EF4444] mb-4">⚠️ Risque de crash: {et.risk}</p>
                  <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant (min ${et.minAmount} $)`} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#F97316]" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer">Annuler</button>
                    <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60">{creating ? '...' : 'Investir'}</button>
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
