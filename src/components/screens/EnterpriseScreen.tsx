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
        addToast('Projet créé !', 'success');
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

  // Map enterprise types to new guaranteed return tiers
  const TYPE_INFO: Record<string, { icon: string; label: string; retRange: string }> = {
    short: { icon: 'fa-bolt', label: 'Court terme', retRange: '+15-28%' },
    medium: { icon: 'fa-building', label: 'Moyen terme', retRange: '+30-48%' },
    long: { icon: 'fa-industry', label: 'Long terme', retRange: '+50-68%' },
    ultralong: { icon: 'fa-rocket', label: 'Ultra long', retRange: '+70-95%' },
  };

  if (!user) return null;

  return (
    <>
      <Header title="Entreprises" icon="fa-building" iconColor="#B89B5E" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto bg-[#050506]">
        {/* Balance - Dark card with gold accent */}
        <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 mb-4">
          <div className="text-[0.7rem] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mb-1">Compte de Projet</div>
          <div className="text-[1.5rem] font-black text-[#B89B5E]">{formatMoney(user.projectBalance)}</div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="text-[0.72rem] text-[#B89B5E] font-semibold mt-1"><i className="fas fa-plus mr-1"></i>Verser des fonds</button>
        </div>

        {/* Enterprise Types - Dark cards, NO risk bars, guaranteed returns */}
        <h3 className="text-[0.88rem] font-bold text-[#EDEDEF] mb-2.5">Types de projets</h3>
        <div className="space-y-2.5 mb-5">
          {ENTERPRISE_TYPES.map((ent) => {
            const info = TYPE_INFO[ent.type];
            return (
              <button key={ent.type} onClick={() => setShowCreate(ent.type)} className="w-full bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-xl p-3.5 text-left cursor-pointer transition-transform active:scale-[0.98]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(184,155,94,0.12)]">
                      <i className={`fas ${info?.icon || ent.icon} text-[#B89B5E]`}></i>
                    </div>
                    <div>
                      <div className="text-[0.82rem] font-bold text-[#EDEDEF]">{ent.name}</div>
                      <div className="text-[0.65rem] text-[rgba(255,255,255,0.4)]">{ent.days} jours</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.82rem] font-bold text-[#B89B5E]">{info?.retRange || `+${ent.minRet}-${ent.maxRet}%`}</div>
                    <div className="text-[0.55rem] text-[rgba(255,255,255,0.3)]">Rendement garanti</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.58rem] text-[rgba(255,255,255,0.3)]">Rendement garanti à l&apos;échéance</span>
                  <i className="fas fa-chevron-right text-[rgba(255,255,255,0.2)] text-[0.65rem]"></i>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Enterprises - Dark cards, NO crash styling */}
        {enterprises.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#EDEDEF] mb-2.5">Mes entreprises</h3>
            {enterprises.map((ent) => {
              const progress = Math.min(100, (ent.daysElapsed / ent.durationDays) * 100);
              const isFinished = ent.isFinished || ent.status === 'completed';
              const isClaimable = isFinished && ent.canClaim;

              return (
                <div key={ent.id} className={`bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-2.5 transition-all ${
                  isClaimable ? 'border-[rgba(184,155,94,0.3)]' : ''
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isClaimable ? 'bg-[#B89B5E]' : isFinished ? 'bg-[#4ADE80]' : 'bg-[rgba(184,155,94,0.5)]'
                      }`} style={isClaimable ? { animation: 'pulseGlow 1.5s ease-in-out infinite' } : undefined}></div>
                      <div className="min-w-0">
                        <div className="text-[0.82rem] font-bold text-[#EDEDEF]">{esc(ent.name)}</div>
                        <div className="text-[0.65rem] text-[rgba(255,255,255,0.4)]">{formatMoney(ent.amount)} · {ent.durationDays}j · +{ent.minReturn}-{ent.maxReturn}%</div>
                      </div>
                    </div>
                    <span className={`text-[0.65rem] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      isClaimable ? 'bg-[rgba(184,155,94,0.15)] text-[#B89B5E]' :
                      isFinished ? 'bg-[rgba(74,222,128,0.1)] text-[#4ADE80]' :
                      'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)]'
                    }`}>
                      {isClaimable ? '✅ Réclamer' : isFinished ? 'Terminé' : 'En cours'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[rgba(255,255,255,0.06)] rounded-full mb-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progress}%`,
                        background: isFinished
                          ? '#B89B5E'
                          : 'linear-gradient(90deg, rgba(184,155,94,0.6), #B89B5E)'
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-[rgba(255,255,255,0.4)]">{ent.daysElapsed}/{ent.durationDays} jours</span>
                    {isClaimable && (
                      <button
                        onClick={() => handleClaim(ent.id)}
                        className="py-2 px-4 rounded-lg bg-[#B89B5E] text-[#050506] text-[0.78rem] font-bold border-none cursor-pointer hover:bg-[#D4B87A] transition-colors"
                        style={{ animation: 'claimPulse 2s ease-in-out infinite' }}
                      >
                        <i className="fas fa-hand-holding-usd mr-1"></i>Réclamer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {enterprises.length === 0 && !loading && (
          <div className="text-center py-8">
            <i className="fas fa-building text-[2rem] text-[rgba(255,255,255,0.15)] mb-3"></i>
            <p className="text-[0.82rem] text-[rgba(255,255,255,0.45)]">Aucune entreprise. Lancez votre premier projet !</p>
          </div>
        )}
      </div>

      {/* Create Enterprise Modal - Dark themed */}
      {showCreate && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowCreate(null)}>
          <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 w-[88%] max-w-[320px]" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const et = ENTERPRISE_TYPES.find(e => e.type === showCreate);
              const info = et ? TYPE_INFO[et.type] : null;
              if (!et) return null;
              return (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <i className={`fas ${info?.icon || et.icon} text-[#B89B5E]`}></i>
                    <h3 className="text-[1rem] font-bold text-[#EDEDEF]">{et.name}</h3>
                  </div>
                  <p className="text-[0.75rem] text-[rgba(255,255,255,0.45)] mb-1">{et.days} jours · {info?.retRange || `+${et.minRet}-${et.maxRet}%`}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[0.68rem] text-[#B89B5E] font-semibold">Rendement garanti à l&apos;échéance</span>
                  </div>
                  <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant (min ${et.minAmount} $)`} className="w-full py-3 px-4 bg-[rgba(255,255,255,0.04)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 text-[#EDEDEF] placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(255,255,255,0.5)] font-semibold text-[0.82rem] cursor-pointer hover:bg-[rgba(255,255,255,0.04)]">Annuler</button>
                    <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl bg-[#B89B5E] text-[#050506] font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60 hover:bg-[#D4B87A] transition-colors">{creating ? '...' : 'Investir'}</button>
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
