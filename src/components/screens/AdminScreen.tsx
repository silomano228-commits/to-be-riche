'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function AdminScreen() {
  const { user, addToast } = useAppStore();
  const [tab, setTab] = useState<'users' | 'deposits' | 'yas' | 'withdrawals' | 'config'>('users');
  const [adminData, setAdminData] = useState<any>(null);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [depositStats, setDepositStats] = useState<any>({});
  const [yasDeposits, setYasDeposits] = useState<any[]>([]);
  const [yasStats, setYasStats] = useState<any>({});
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<any>({});
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [configAddr, setConfigAddr] = useState('');
  const [configPrice, setConfigPrice] = useState('');
  const [configYasAddr, setConfigYasAddr] = useState('');
  const [configCfaRate, setConfigCfaRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [yasNote, setYasNote] = useState<Record<string, string>>({});
  const [savingYas, setSavingYas] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Ensure spin animation is available
  useEffect(() => {
    if (!document.getElementById('admin-spin-style')) {
      const style = document.createElement('style');
      style.id = 'admin-spin-style';
      style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  }, []);

  const loadData = useCallback(async () => {
    try { const r = await authFetch('/api/admin/data'); const d = await r.json(); if (d.success) setAdminData(d); } catch { /* */ }
    setLoading(false);
  }, []);

  const loadDeposits = useCallback(async () => {
    try { const r = await authFetch('/api/admin/deposits'); const d = await r.json(); if (d.success) { setPendingDeposits(d.data || []); setDepositStats(d.stats || {}); } } catch { /* */ }
  }, []);

  const loadYasDeposits = useCallback(async () => {
    try { const r = await authFetch('/api/admin/yas-deposits'); const d = await r.json(); if (d.success) { setYasDeposits(d.data || []); setYasStats(d.stats || {}); } } catch { /* */ }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    try { const r = await authFetch('/api/admin/withdrawals'); const d = await r.json(); if (d.success) { setWithdrawals(d.data || []); setWithdrawalStats(d.stats || {}); } } catch { /* */ }
  }, []);

  const loadConfig = useCallback(async () => {
    try { const r = await authFetch('/api/admin/config'); const d = await r.json(); if (d.success) { setSiteConfig(d.data); setConfigAddr(d.data.adminTrxAddress || ''); setConfigPrice(String(d.data.trxUsdPrice || '')); setConfigYasAddr(d.data.adminYasAccount || ''); setConfigCfaRate(String(d.data.cfaUsdRate || '600')); } } catch { /* */ }
  }, []);

  useEffect(() => { const t = setTimeout(() => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); }, 0); return () => clearTimeout(t); }, [loadData, loadDeposits, loadYasDeposits, loadWithdrawals, loadConfig]);

  if (!user || user.role !== 'admin') return null;
  const stats = adminData?.stats || {};
  const usersList = adminData?.users || [];

  const refreshAll = () => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); };

  return (
    <>
      <Header title="Admin" icon="fa-shield-alt" iconColor="#FBBF24" leftElement={<button onClick={() => useAppStore.getState().setPage('profile')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} rightElement={<button onClick={refreshAll} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none"><i className="fas fa-sync-alt text-[0.7rem]"></i></button>} />
      <div className="flex-1 w-full overflow-y-auto">
        {/* Tabs - now with Yas tab */}
        <div className="flex bg-[#F8FAFC] border-b border-[rgba(0,0,0,0.04)] px-1 overflow-x-auto">
          {[
            { k: 'users', l: 'Users' },
            { k: 'deposits', l: 'Dépôts TRX' },
            { k: 'yas', l: 'Yas 🇹🇬' },
            { k: 'withdrawals', l: 'Retraits' },
            { k: 'config', l: 'Config' },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`flex-1 min-w-0 py-3 text-[0.65rem] font-semibold border-none cursor-pointer transition-all whitespace-nowrap px-1 ${tab === t.k ? 'text-[#00C853] border-b-2 border-[#00C853]' : 'text-[#94A3B8]'}`}>{t.l}</button>
          ))}
        </div>

        <div className="px-[18px] py-4">
          {loading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-3 border-gray-200 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div> : (
            <>
              {/* Users Tab */}
              {tab === 'users' && (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Utilisateurs', value: stats.total_users || 0, color: '#3B82F6' },
                      { label: 'Total investi', value: formatMoney(stats.total_balance || 0), color: '#00C853' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.9rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.6rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {usersList.map((u: any) => (
                    <div key={u.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between"><div><div className="text-[0.78rem] font-bold text-[#1A2332]">{esc(u.name)} {u.role === 'admin' && <span className="text-[0.6rem] bg-[#FEF9C3] text-[#92400E] px-1.5 py-0.5 rounded-full ml-1">Admin</span>}</div><div className="text-[0.65rem] text-[#94A3B8]">{esc(u.email)}</div></div><div className="text-right"><div className="text-[0.75rem] font-bold">{formatMoney(u.balance)}</div><div className="text-[0.6rem] text-[#00C853]">Invest: {formatMoney(u.investBalance || 0)}</div></div></div>
                    </div>
                  ))}
                </>
              )}

              {/* Deposits Tab (TRX) */}
              {tab === 'deposits' && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[{ label: 'En attente', value: depositStats.pending || 0, color: '#F59E0B' }, { label: 'Approuvés', value: depositStats.approved || 0, color: '#00C853' }, { label: 'Rejetés', value: depositStats.rejected || 0, color: '#EF4444' }].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.55rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {pendingDeposits.filter(d => d.status === 'pending').map((d: any) => (
                    <div key={d.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#00C853]">
                      <div className="flex items-center justify-between mb-2"><div><div className="text-[0.78rem] font-bold">{esc(d.user?.name || '?')}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(d.amountUsd)} → {d.amountTrx?.toFixed(2)} TRX</div><div className="text-[0.6rem] text-[#94A3B8] mt-0.5">Adresse: {esc(d.userAddress?.slice(0, 12))}...</div></div><span className="text-[0.6rem] bg-[#FEF9C3] text-[#92400E] px-2 py-0.5 rounded-full">TRX</span></div>
                      <div className="flex gap-2"><button onClick={async () => { const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve' }) }); const data = await r.json(); if (data.success) { addToast('Approuvé', 'success'); loadDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Approuver</button><button onClick={async () => { const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject' }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button></div>
                    </div>
                  ))}
                  {pendingDeposits.filter(d => d.status === 'pending').length === 0 && <p className="text-center text-[0.82rem] text-[#94A3B8] py-4">Aucun dépôt TRX en attente</p>}
                </>
              )}

              {/* Yas du Togo Tab */}
              {tab === 'yas' && (
                <>
                  <div className="bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-xl p-3 mb-4 flex items-center gap-2">
                    <i className="fas fa-exchange-alt text-white text-[0.9rem]"></i>
                    <div>
                      <div className="text-white text-[0.85rem] font-bold">Conversions Yas du Togo</div>
                      <div className="text-[rgba(255,255,255,0.7)] text-[0.65rem]">Approuvez pour créditer et envoyer les TRX</div>
                    </div>
                  </div>

                  {/* Yas Config Section - Admin's own Yas number + CFA rate */}
                  <div className="bg-[#F5F3FF] rounded-xl p-3.5 mb-4 border border-[#C4B5FD]/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center shrink-0">
                        <i className="fas fa-cog text-white text-[0.65rem]"></i>
                      </div>
                      <div className="text-[0.78rem] font-bold text-[#4C1D95]">Configuration Yas</div>
                    </div>
                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.7rem] font-semibold text-[#6D28D9]">Votre numéro Yas (affiché aux utilisateurs)</label>
                      <input
                        type="text"
                        value={configYasAddr}
                        onChange={(e) => setConfigYasAddr(e.target.value)}
                        placeholder="90XXXXXX ou 70XXXXXX"
                        maxLength={8}
                        className="w-full py-2.5 px-3 bg-white border-[1.5px] border-[rgba(124,58,237,0.2)] rounded-lg text-[0.82rem] outline-none focus:border-[#7C3AED]"
                      />
                      {configYasAddr && !/^(9[0-3]|7[0-3])\d{6}$/.test(configYasAddr.trim()) && (
                        <p className="text-[0.6rem] text-[#EF4444] mt-1">Format: 8 chiffres, commence par 90-93 ou 70-73</p>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="block mb-1 text-[0.7rem] font-semibold text-[#6D28D9]">Taux CFA/USD (1 USD = ? CFA)</label>
                      <input
                        type="number"
                        step="1"
                        value={configCfaRate}
                        onChange={(e) => setConfigCfaRate(e.target.value)}
                        className="w-full py-2.5 px-3 bg-white border-[1.5px] border-[rgba(124,58,237,0.2)] rounded-lg text-[0.82rem] outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        setSavingYas(true);
                        try {
                          const r = await authFetch('/api/admin/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ adminYasAccount: configYasAddr, cfaUsdRate: configCfaRate })
                          });
                          const d = await r.json();
                          if (d.success) {
                            addToast('Config Yas sauvegardée !', 'success');
                            await loadConfig();
                          } else {
                            addToast(d.error || 'Erreur de sauvegarde', 'error');
                          }
                        } catch (e) {
                          addToast('Erreur réseau', 'error');
                        }
                        setSavingYas(false);
                      }}
                      disabled={savingYas}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-[0.78rem] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {savingYas ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <i className="fas fa-save text-[0.7rem]"></i>}
                      {savingYas ? 'Sauvegarde...' : 'Sauvegarder la config Yas'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[{ label: 'En attente', value: yasStats.pending || 0, color: '#F59E0B' }, { label: 'Approuvées', value: yasStats.approved || 0, color: '#00C853' }, { label: 'Rejetées', value: yasStats.rejected || 0, color: '#EF4444' }].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.55rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {yasDeposits.filter(d => d.status === 'pending').map((d: any) => (
                    <div key={d.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#7C3AED]">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[0.78rem] font-bold text-[#1A2332]">{esc(d.user?.name || '?')}</div>
                          <div className="text-[0.65rem] text-[#64748B]">{d.amountCfa ? `${d.amountCfa.toLocaleString()} FCFA` : formatMoney(d.amountUsd)} → {d.amountTrx?.toFixed(2)} TRX</div>
                          {d.amountCfa > 0 && <div className="text-[0.6rem] text-[#7C3AED]">{formatMoney(d.amountUsd)} USD</div>}
                        </div>
                        <span className="text-[0.6rem] bg-[#EDE9FE] text-[#4C1D95] px-2 py-0.5 rounded-full font-semibold">Yas 🇹🇬</span>
                      </div>
                      <div className="bg-[#F8FAFC] rounded-lg p-2.5 mb-2 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.65rem] text-[#64748B]">Compte Yas client</span>
                          <span className="text-[0.7rem] font-bold text-[#1A2332]">{esc(d.yasAccount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[0.65rem] text-[#64748B]">Adresse TRX</span>
                          <span className="text-[0.65rem] font-mono font-bold text-[#7C3AED]">{esc(d.trxAddress?.slice(0, 16))}...</span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <input
                          type="text"
                          value={yasNote[d.id] || ''}
                          onChange={(e) => setYasNote(prev => ({ ...prev, [d.id]: e.target.value }))}
                          placeholder="Note admin (optionnel)"
                          className="w-full py-2 px-3 bg-[#F8FAFC] border-[1px] border-[rgba(0,0,0,0.06)] rounded-lg text-[0.72rem] outline-none focus:border-[#7C3AED]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          const r = await authFetch('/api/admin/yas-deposits', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ depositId: d.id, action: 'approve', adminNote: yasNote[d.id] || 'Conversion effectuée. TRX envoyé à votre adresse.' })
                          });
                          const data = await r.json();
                          if (data.success) { addToast('Approuvé - TRX crédités', 'success'); loadYasDeposits(); }
                          else addToast(data.error, 'error');
                        }} className="flex-1 py-2 rounded-lg bg-[#7C3AED] text-white text-[0.72rem] font-semibold border-none cursor-pointer">
                          <i className="fas fa-check mr-1"></i>Approuver
                        </button>
                        <button onClick={async () => {
                          const r = await authFetch('/api/admin/yas-deposits', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ depositId: d.id, action: 'reject', adminNote: yasNote[d.id] || undefined })
                          });
                          const data = await r.json();
                          if (data.success) { addToast('Rejeté', 'info'); loadYasDeposits(); }
                          else addToast(data.error, 'error');
                        }} className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button>
                      </div>
                    </div>
                  ))}
                  {yasDeposits.filter(d => d.status === 'pending').length === 0 && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-[#F5F3FF] flex items-center justify-center mx-auto mb-2">
                        <i className="fas fa-check-circle text-[#7C3AED] text-[1.2rem]"></i>
                      </div>
                      <p className="text-[0.82rem] text-[#94A3B8]">Aucune conversion Yas en attente</p>
                    </div>
                  )}
                </>
              )}

              {/* Withdrawals Tab */}
              {tab === 'withdrawals' && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[{ label: 'En attente', value: withdrawalStats.pending || 0, color: '#F59E0B' }, { label: 'Approuvés', value: withdrawalStats.approved || 0, color: '#00C853' }, { label: 'Rejetés', value: withdrawalStats.rejected || 0, color: '#EF4444' }].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.55rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {withdrawals.filter(w => w.status === 'pending').map((w: any) => (
                    <div key={w.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#F59E0B]">
                      <div className="flex items-center justify-between mb-2"><div><div className="text-[0.78rem] font-bold">{esc(w.user?.name || '?')}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(w.amount)} → {esc(w.trxAddress?.slice(0, 10))}...</div></div><span className="text-[0.6rem] bg-[#FEF9C3] text-[#92400E] px-2 py-0.5 rounded-full">En attente</span></div>
                      <div className="flex gap-2"><button onClick={async () => { const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'approve' }) }); const data = await r.json(); if (data.success) { addToast('Approuvé', 'success'); loadWithdrawals(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Approuver</button><button onClick={async () => { const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadWithdrawals(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button></div>
                    </div>
                  ))}
                  {withdrawals.filter(w => w.status === 'pending').length === 0 && <p className="text-center text-[0.82rem] text-[#94A3B8] py-4">Aucun retrait en attente</p>}
                </>
              )}

              {/* Config Tab */}
              {tab === 'config' && siteConfig && (
                <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                  <div className="mb-3"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Adresse TRX Admin</label><input type="text" value={configAddr} onChange={(e) => setConfigAddr(e.target.value)} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] outline-none focus:border-[#FBBF24]" /></div>
                  <div className="mb-3"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Prix TRX (USD)</label><input type="number" step="0.001" value={configPrice} onChange={(e) => setConfigPrice(e.target.value)} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] outline-none focus:border-[#FBBF24]" /></div>
                  <div className="bg-[#F5F3FF] rounded-xl p-3 mb-3 border border-[#C4B5FD]/30">
                    <div className="text-[0.72rem] font-bold text-[#4C1D95] mb-2"><i className="fas fa-exchange-alt mr-1"></i>Config Yas du Togo</div>
                    <div className="mb-3"><label className="block mb-1 text-[0.72rem] font-semibold text-[#6D28D9]">Numéro Yas Admin</label><input type="text" value={configYasAddr} onChange={(e) => setConfigYasAddr(e.target.value)} placeholder="90XXXXXX ou 70XXXXXX" className="w-full py-3 px-4 bg-white border-[1.5px] border-[rgba(124,58,237,0.2)] rounded-xl text-[0.85rem] outline-none focus:border-[#7C3AED]" /></div>
                    <div><label className="block mb-1 text-[0.72rem] font-semibold text-[#6D28D9]">Taux CFA/USD (1 USD = ? CFA)</label><input type="number" step="1" value={configCfaRate} onChange={(e) => setConfigCfaRate(e.target.value)} className="w-full py-3 px-4 bg-white border-[1.5px] border-[rgba(124,58,237,0.2)] rounded-xl text-[0.85rem] outline-none focus:border-[#7C3AED]" /></div>
                  </div>
                  <button onClick={async () => { setSavingConfig(true); try { const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminTrxAddress: configAddr, trxUsdPrice: configPrice, adminYasAccount: configYasAddr, cfaUsdRate: configCfaRate }) }); const d = await r.json(); if (d.success) { addToast('Config sauvegardée', 'success'); await loadConfig(); } else addToast(d.error, 'error'); } catch { addToast('Erreur', 'error'); } setSavingConfig(false); }} disabled={savingConfig} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">{savingConfig ? <div className="w-4 h-4 border-2 border-[rgba(120,53,15,0.3)] border-t-[#78350F] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <i className="fas fa-save mr-1"></i>}{savingConfig ? 'Sauvegarde...' : 'Sauvegarder'}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
