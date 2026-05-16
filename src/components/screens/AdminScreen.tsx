'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function AdminScreen() {
  const { user, addToast } = useAppStore();
  const [tab, setTab] = useState<'users' | 'deposits' | 'withdrawals' | 'config'>('users');
  const [adminData, setAdminData] = useState<any>(null);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [depositStats, setDepositStats] = useState<any>({});
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<any>({});
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [configAddr, setConfigAddr] = useState('');
  const [configPrice, setConfigPrice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try { const r = await authFetch('/api/admin/data'); const d = await r.json(); if (d.success) setAdminData(d); } catch { /* */ }
    setLoading(false);
  }, []);

  const loadDeposits = useCallback(async () => {
    try { const r = await authFetch('/api/admin/deposits'); const d = await r.json(); if (d.success) { setPendingDeposits(d.data || []); setDepositStats(d.stats || {}); } } catch { /* */ }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    try { const r = await authFetch('/api/admin/withdrawals'); const d = await r.json(); if (d.success) { setWithdrawals(d.data || []); setWithdrawalStats(d.stats || {}); } } catch { /* */ }
  }, []);

  const loadConfig = useCallback(async () => {
    try { const r = await authFetch('/api/admin/config'); const d = await r.json(); if (d.success) { setSiteConfig(d.data); setConfigAddr(d.data.adminTrxAddress || ''); setConfigPrice(String(d.data.trxUsdPrice || '')); } } catch { /* */ }
  }, []);

  useEffect(() => { const t = setTimeout(() => { loadData(); loadDeposits(); loadWithdrawals(); loadConfig(); }, 0); return () => clearTimeout(t); }, [loadData, loadDeposits, loadWithdrawals, loadConfig]);

  if (!user || user.role !== 'admin') return null;
  const stats = adminData?.stats || {};
  const usersList = adminData?.users || [];

  return (
    <>
      <Header title="Admin" icon="fa-shield-alt" iconColor="#FBBF24" leftElement={<button onClick={() => useAppStore.getState().setPage('profile')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} rightElement={<button onClick={() => { loadData(); loadDeposits(); loadWithdrawals(); loadConfig(); }} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none"><i className="fas fa-sync-alt text-[0.7rem]"></i></button>} />
      <div className="flex-1 w-full overflow-y-auto">
        {/* Tabs */}
        <div className="flex bg-[#F8FAFC] border-b border-[rgba(0,0,0,0.04)] px-2">
          {[{ k: 'users', l: 'Utilisateurs' }, { k: 'deposits', l: 'Dépôts' }, { k: 'withdrawals', l: 'Retraits' }, { k: 'config', l: 'Config' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`flex-1 py-3 text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${tab === t.k ? 'text-[#00C853] border-b-2 border-[#00C853]' : 'text-[#94A3B8]'}`}>{t.l}</button>
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

              {/* Deposits Tab */}
              {tab === 'deposits' && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[{ label: 'En attente', value: depositStats.pending || 0, color: '#F59E0B' }, { label: 'Approuvés', value: depositStats.approved || 0, color: '#00C853' }, { label: 'Rejetés', value: depositStats.rejected || 0, color: '#EF4444' }].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.55rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {pendingDeposits.filter(d => d.status === 'pending').map((d: any) => (
                    <div key={d.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#F59E0B]">
                      <div className="flex items-center justify-between mb-2"><div><div className="text-[0.78rem] font-bold">{esc(d.user?.name || '?')}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(d.amountUsd)}</div></div><span className="text-[0.6rem] bg-[#FEF9C3] text-[#92400E] px-2 py-0.5 rounded-full">En attente</span></div>
                      <div className="flex gap-2"><button onClick={async () => { const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve' }) }); const data = await r.json(); if (data.success) { addToast('Approuvé', 'success'); loadDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Approuver</button><button onClick={async () => { const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject' }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button></div>
                    </div>
                  ))}
                  {pendingDeposits.filter(d => d.status === 'pending').length === 0 && <p className="text-center text-[0.82rem] text-[#94A3B8] py-4">Aucun dépôt en attente</p>}
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
                  <div className="mb-4"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Prix TRX (USD)</label><input type="number" step="0.001" value={configPrice} onChange={(e) => setConfigPrice(e.target.value)} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] outline-none focus:border-[#FBBF24]" /></div>
                  <button onClick={async () => { try { const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminTrxAddress: configAddr, trxUsdPrice: configPrice }) }); const d = await r.json(); if (d.success) addToast('Config sauvegardée', 'success'); else addToast(d.error, 'error'); } catch { addToast('Erreur', 'error'); } }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.85rem] border-none cursor-pointer"><i className="fas fa-save mr-1"></i>Sauvegarder</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
