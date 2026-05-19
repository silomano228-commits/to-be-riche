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
      <Header title="Entreprises" icon="fa-building" iconColor="#8B5CF6" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto bg-[#F8F9FA]">
        {/* Balance - White card with gold accent */}
        <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-4">
          <div className="text-[0.7rem] text-[rgba(0,0,0,0.45)] uppercase tracking-[1.5px] mb-1">Compte de Projet</div>
          <div className="text-[1.5rem] font-black text-[#8B5CF6]">{formatMoney(user.projectBalance)}</div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="text-[0.72rem] text-[#8B5CF6] font-semibold mt-1"><i className="fas fa-plus mr-1"></i>Verser des fonds</button>
        </div>

        {/* Enterprise Types - White cards, NO risk bars, guaranteed returns */}
        <h3 className="text-[0.88rem] font-bold text-[#1F2937] mb-2.5">Types de projets</h3>
        <div className="space-y-2.5 mb-5">
          {ENTERPRISE_TYPES.map((ent) => {
            const info = TYPE_INFO[ent.type];
            return (
              <button key={ent.type} onClick={() => setShowCreate(ent.type)} className="w-full bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3.5 text-left cursor-pointer transition-transform active:scale-[0.98]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(139,92,246,0.12)]">
                      <i className={`fas ${info?.icon || ent.icon} text-[#8B5CF6]`}></i>
                    </div>
                    <div>
                      <div className="text-[0.82rem] font-bold text-[#1F2937]">{ent.name}</div>
                      <div className="text-[0.65rem] text-[rgba(0,0,0,0.5)]">{ent.days} jours</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.82rem] font-bold text-[#8B5CF6]">{info?.retRange || `+${ent.minRet}-${ent.maxRet}%`}</div>
                    <div className="text-[0.55rem] text-[rgba(0,0,0,0.4)]">Rendement garanti</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.58rem] text-[rgba(0,0,0,0.4)]">Rendement garanti à l&apos;échéance</span>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.25)] text-[0.65rem]"></i>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Enterprises - White cards, NO crash styling */}
        {enterprises.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1F2937] mb-2.5">Mes entreprises</h3>
            {enterprises.map((ent) => {
              const progress = Math.min(100, (ent.daysElapsed / ent.durationDays) * 100);
              const isFinished = ent.isFinished || ent.status === 'completed';
              const isClaimable = isFinished && ent.canClaim;

              return (
                <div key={ent.id} className={`bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-4 mb-2.5 transition-all ${
                  isClaimable ? 'border-[rgba(139,92,246,0.3)]' : ''
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isClaimable ? 'bg-[#8B5CF6]' : isFinished ? 'bg-[#4ADE80]' : 'bg-[rgba(139,92,246,0.5)]'
                      }`} style={isClaimable ? { animation: 'pulseGlow 1.5s ease-in-out infinite' } : undefined}></div>
                      <div className="min-w-0">
                        <div className="text-[0.82rem] font-bold text-[#1F2937]">{esc(ent.name)}</div>
                        <div className="text-[0.65rem] text-[rgba(0,0,0,0.5)]">{formatMoney(ent.amount)} · {ent.durationDays}j · +{ent.minReturn}-{ent.maxReturn}%</div>
                      </div>
                    </div>
                    <span className={`text-[0.65rem] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      isClaimable ? 'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]' :
                      isFinished ? 'bg-[rgba(74,222,128,0.1)] text-[#4ADE80]' :
                      'bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.6)]'
                    }`}>
                      {isClaimable ? '✅ Réclamer' : isFinished ? 'Terminé' : 'En cours'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[rgba(0,0,0,0.08)] rounded-full mb-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progress}%`,
                        background: isFinished
                          ? '#8B5CF6'
                          : 'linear-gradient(90deg, rgba(139,92,246,0.6), #8B5CF6)'
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-[rgba(0,0,0,0.5)]">{ent.daysElapsed}/{ent.durationDays} jours</span>
                    {isClaimable && (
                      <button
                        onClick={() => handleClaim(ent.id)}
                        className="py-2 px-4 rounded-lg bg-[#8B5CF6] text-[#FFFFFF] text-[0.78rem] font-bold border-none cursor-pointer hover:bg-[#A78BFA] transition-colors"
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
            <i className="fas fa-building text-[2rem] text-[rgba(0,0,0,0.2)] mb-3"></i>
            <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)]">Aucune entreprise. Lancez votre premier projet !</p>
          </div>
        )}
      </div>

      {/* Create Enterprise Modal - Light themed */}
      {showCreate && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowCreate(null)}>
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-6 w-[88%] max-w-[320px]" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const et = ENTERPRISE_TYPES.find(e => e.type === showCreate);
              const info = et ? TYPE_INFO[et.type] : null;
              if (!et) return null;
              return (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <i className={`fas ${info?.icon || et.icon} text-[#8B5CF6]`}></i>
                    <h3 className="text-[1rem] font-bold text-[#1F2937]">{et.name}</h3>
                  </div>
                  <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-1">{et.days} jours · {info?.retRange || `+${et.minRet}-${et.maxRet}%`}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[0.68rem] text-[#8B5CF6] font-semibold">Rendement garanti à l&apos;échéance</span>
                  </div>
                  <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant (min ${et.minAmount} $)`} className="w-full py-3 px-4 bg-[rgba(0,0,0,0.05)] border-[1.5px] border-[rgba(0,0,0,0.1)] rounded-xl text-[0.88rem] outline-none mb-4 text-[#1F2937] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#8B5CF6]" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.1)] bg-transparent text-[rgba(0,0,0,0.6)] font-semibold text-[0.82rem] cursor-pointer hover:bg-[rgba(0,0,0,0.05)]">Annuler</button>
                    <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl bg-[#8B5CF6] text-[#FFFFFF] font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60 hover:bg-[#A78BFA] transition-colors">{creating ? '...' : 'Investir'}</button>
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
