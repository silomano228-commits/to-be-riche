'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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
  const [withdrawalNotifCount, setWithdrawalNotifCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'pending' | 'approved' | 'executed' | 'rejected' | 'all'>('pending');
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [withdrawalsError, setWithdrawalsError] = useState<string | null>(null);

  // Ensure spin animation is available
  useEffect(() => {
    if (!document.getElementById('admin-spin-style')) {
      const style = document.createElement('style');
      style.id = 'admin-spin-style';
      style.textContent = `@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`;
      document.head.appendChild(style);
    }
  }, []);

  // Data loading callbacks — declared BEFORE the socket useEffect that references them
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
    setWithdrawalsLoading(true);
    setWithdrawalsError(null);
    try {
      const r = await authFetch('/api/admin/withdrawals');
      console.log('[ADMIN] Withdrawals response status:', r.status);
      if (!r.ok) {
        setWithdrawalsError(`Erreur HTTP ${r.status}`);
        return;
      }
      const d = await r.json();
      console.log('[ADMIN] Withdrawals data:', d.success ? `${(d.data || []).length} withdrawals` : d.error);
      if (d.success) {
        const ws = d.data || [];
        console.log('[ADMIN] YAS withdrawals:', ws.filter((w: any) => w.type === 'yas').length);
        console.log('[ADMIN] TRX withdrawals:', ws.filter((w: any) => w.type === 'trx').length);
        ws.forEach((w: any) => console.log(`  → ${w.type} | ${w.status} | ${w.amount} | yas:${w.yasAccount || 'n/a'} | trx:${w.trxAddress || 'n/a'}`));
        setWithdrawals(ws);
        setWithdrawalStats(d.stats || {});
      } else {
        console.error('[ADMIN] Withdrawals API error:', d.error);
        setWithdrawalsError(d.error || 'Erreur inconnue');
      }
    } catch (e) {
      console.error('[ADMIN] loadWithdrawals error:', e);
      setWithdrawalsError('Erreur réseau');
    } finally {
      setWithdrawalsLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try { const r = await authFetch('/api/admin/config'); const d = await r.json(); if (d.success) { setSiteConfig(d.data); setConfigAddr(d.data.adminTrxAddress || ''); setConfigPrice(String(d.data.trxUsdPrice || '')); setConfigYasAddr(d.data.adminYasAccount || ''); setConfigCfaRate(String(d.data.cfaUsdRate || '600')); } } catch { /* */ }
  }, []);

  // Socket.io connection for real-time withdrawal notifications
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { userId: user.id, userRole: user.role, userName: user.name },
      query: { XTransformPort: '3003' },
    });

    socket.on('connect', () => {
      console.log('[ADMIN] Socket connected for withdrawal notifications');
    });

    // Listen for new withdrawal notifications
    socket.on('new-withdrawal', (data: {
      withdrawalId: string;
      type: 'trx' | 'yas';
      userId: string;
      userName: string;
      amount: number;
      amountCfa?: number;
      yasAccount?: string;
      trxAddress?: string;
    }) => {
      console.log('[ADMIN] New withdrawal notification:', data.type, data.amount);
      setWithdrawalNotifCount(prev => prev + 1);
      addToast(`Nouveau retrait ${data.type === 'yas' ? 'Yas' : 'TRX'}: ${formatMoney(data.amount)} de ${data.userName}`, 'info');
      // Auto-reload withdrawals
      loadWithdrawals();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, user?.role, loadWithdrawals]);

  // Load data on mount AND when user becomes available
  useEffect(() => {
    if (!user?.id) return; // Wait until user is authenticated
    const t = setTimeout(() => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); }, 0);
    return () => clearTimeout(t);
  }, [user?.id, loadData, loadDeposits, loadYasDeposits, loadWithdrawals, loadConfig]);

  if (!user || user.role !== 'admin') return null;
  const stats = adminData?.stats || {};
  const usersList = adminData?.users || [];

  const refreshAll = () => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); setWithdrawalNotifCount(0); };

  // Filtered withdrawals
  const filteredWithdrawals = withdrawalFilter === 'all' ? withdrawals : withdrawals.filter((w: any) => w.status === withdrawalFilter);
  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === 'pending');
  const approvedWithdrawals = withdrawals.filter((w: any) => w.status === 'approved');
  const pendingYasWithdrawals = [...pendingWithdrawals, ...approvedWithdrawals].filter((w: any) => w.type === 'yas');
  const pendingTrxWithdrawals = [...pendingWithdrawals, ...approvedWithdrawals].filter((w: any) => w.type === 'trx');

  return (
    <>
      <Header
        title="Admin"
        icon="fa-shield-alt"
        iconColor="#6366F1"
        leftElement={
          <button
            onClick={() => useAppStore.getState().setPage('profile')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none mr-1"
          >
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
        rightElement={
          <button
            onClick={refreshAll}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none"
          >
            <i className="fas fa-sync-alt text-[0.7rem]"></i>
          </button>
        }
      />
      <div className="flex-1 w-full overflow-y-auto min-h-0">
        {/* Tabs */}
        <div className="flex bg-[#0E0F11] border-b border-[rgba(255,255,255,0.06)] px-1 overflow-x-auto">
          {[
            { k: 'users', l: 'Users' },
            { k: 'deposits', l: 'Dépôts TRX' },
            { k: 'yas', l: 'Yas 🇹🇬' },
            { k: 'withdrawals', l: `Retraits${withdrawalNotifCount > 0 ? ` (${withdrawalNotifCount})` : ''}`, notif: withdrawalNotifCount },
            { k: 'config', l: 'Config' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => { setTab(t.k as any); if (t.k === 'withdrawals') { setWithdrawalNotifCount(0); loadWithdrawals(); } }}
              className={`flex-1 min-w-0 py-3 text-[0.65rem] font-semibold border-none cursor-pointer transition-all whitespace-nowrap px-1 rounded-none relative ${
                tab === t.k
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                  : 'text-[rgba(255,255,255,0.45)]'
              }`}
            >
              {t.l}
              {t.notif && t.notif > 0 && tab !== t.k && (
                <span className="absolute -top-0.5 right-0.5 w-4 h-4 bg-[#F87171] text-white text-[0.5rem] font-bold rounded-full flex items-center justify-center">{t.notif > 9 ? '9+' : t.notif}</span>
              )}
            </button>
          ))}
        </div>

        <div className="px-[18px] py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-3 border-[rgba(255,255,255,0.1)] border-t-[#6366F1] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Users Tab */}
              {tab === 'users' && (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Utilisateurs', value: stats.total_users || 0, color: '#818CF8' },
                      { label: 'Total investi', value: formatMoney(stats.total_balance || 0), color: '#4ADE80' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 text-center">
                        <div className="text-[0.9rem] font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[0.6rem] text-[rgba(255,255,255,0.25)] uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {usersList.map((u: any) => (
                    <div key={u.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[0.78rem] font-bold text-[#EDEDEF]">
                            {esc(u.name)}{' '}
                            {u.role === 'admin' && (
                              <span className="text-[0.6rem] bg-[rgba(99,102,241,0.12)] text-[#6366F1] px-1.5 py-0.5 rounded-full ml-1">Admin</span>
                            )}
                          </div>
                          <div className="text-[0.65rem] text-[rgba(255,255,255,0.25)]">{esc(u.email)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[0.75rem] font-bold text-[#EDEDEF]">{formatMoney(u.balance)}</div>
                          <div className="text-[0.6rem] text-[#4ADE80]">Invest: {formatMoney(u.investBalance || 0)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Deposits Tab (TRX) */}
              {tab === 'deposits' && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'En attente', value: depositStats.pending || 0, color: '#818CF8' },
                      { label: 'Approuvés', value: depositStats.approved || 0, color: '#4ADE80' },
                      { label: 'Rejetés', value: depositStats.rejected || 0, color: '#F87171' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-2.5 text-center">
                        <div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[0.55rem] text-[rgba(255,255,255,0.25)] uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {pendingDeposits.filter(d => d.status === 'pending').map((d: any) => (
                    <div key={d.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] border-l-[#6366F1] rounded-2xl p-3 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[0.78rem] font-bold text-[#EDEDEF]">{esc(d.user?.name || '?')}</div>
                          <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">{formatMoney(d.amountUsd)} → {d.amountTrx?.toFixed(2)} TRX</div>
                        </div>
                        <span className="text-[0.6rem] bg-[rgba(99,102,241,0.12)] text-[#6366F1] px-2 py-0.5 rounded-full">TRX</span>
                      </div>
                      <div className="bg-[#161719] rounded-lg p-2.5 mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Adresse TRX client</span>
                          <button
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(d.userAddress || ''); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur de copie', 'error'); }
                            }}
                            className="text-[0.6rem] text-[#6366F1] hover:text-[#818CF8] cursor-pointer bg-transparent border-none flex items-center gap-1"
                          >
                            <i className="fas fa-copy text-[0.55rem]"></i> Copier
                          </button>
                        </div>
                        <div className="text-[0.72rem] font-mono font-bold text-[#818CF8] break-all leading-relaxed mt-1">{esc(d.userAddress || 'Non renseigné')}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve' }) });
                            const data = await r.json();
                            if (data.success) { addToast('Approuvé', 'success'); loadDeposits(); } else addToast(data.error, 'error');
                          }}
                          className="flex-1 py-2 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"
                        >Approuver</button>
                        <button
                          onClick={async () => {
                            const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject' }) });
                            const data = await r.json();
                            if (data.success) { addToast('Rejeté', 'info'); loadDeposits(); } else addToast(data.error, 'error');
                          }}
                          className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer"
                        >Rejeter</button>
                      </div>
                    </div>
                  ))}
                  {pendingDeposits.filter(d => d.status === 'pending').length === 0 && (
                    <p className="text-center text-[0.82rem] text-[rgba(255,255,255,0.25)] py-4">Aucun dépôt TRX en attente</p>
                  )}
                </>
              )}

              {/* Yas du Togo Tab */}
              {tab === 'yas' && (
                <>
                  <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.15)] rounded-2xl p-3 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0">
                      <i className="fas fa-exchange-alt text-[#6366F1] text-[0.9rem]"></i>
                    </div>
                    <div>
                      <div className="text-[#EDEDEF] text-[0.85rem] font-bold">Conversions Yas du Togo</div>
                      <div className="text-[rgba(255,255,255,0.45)] text-[0.65rem]">Approuvez pour créditer et envoyer les TRX</div>
                    </div>
                  </div>

                  {/* Yas Config Section */}
                  <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.12)] rounded-2xl p-3.5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-cog text-[#6366F1] text-[0.65rem]"></i></div>
                      <div className="text-[0.78rem] font-bold text-[#EDEDEF]">Configuration Yas</div>
                    </div>
                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.7rem] font-semibold text-[rgba(255,255,255,0.45)]">Votre numéro Yas (affiché aux utilisateurs)</label>
                      <input type="text" value={configYasAddr} onChange={(e) => setConfigYasAddr(e.target.value)} placeholder="90XXXXXX ou 70XXXXXX" maxLength={8} className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.82rem] text-white outline-none focus:border-[#6366F1]" />
                      {configYasAddr && !/^(9[0-3]|7[0-3])\d{6}$/.test(configYasAddr.trim()) && (
                        <p className="text-[0.6rem] text-[#F87171] mt-1">Format: 8 chiffres, commence par 90-93 ou 70-73</p>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="block mb-1 text-[0.7rem] font-semibold text-[rgba(255,255,255,0.45)]">Taux CFA/USD (1 USD = ? CFA)</label>
                      <input type="number" step="1" value={configCfaRate} onChange={(e) => setConfigCfaRate(e.target.value)} className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.82rem] text-white outline-none focus:border-[#6366F1]" />
                    </div>
                    <button
                      onClick={async () => {
                        setSavingYas(true);
                        try {
                          const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminYasAccount: configYasAddr, cfaUsdRate: configCfaRate }) });
                          const d = await r.json();
                          if (d.success) { addToast('Config Yas sauvegardée !', 'success'); await loadConfig(); } else { addToast(d.error || 'Erreur de sauvegarde', 'error'); }
                        } catch (e) { addToast('Erreur réseau', 'error'); }
                        setSavingYas(false);
                      }}
                      disabled={savingYas}
                      className="w-full py-2.5 rounded-lg bg-[#6366F1] text-[#050506] text-[0.78rem] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {savingYas ? <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <i className="fas fa-save text-[0.7rem]"></i>}
                      {savingYas ? 'Sauvegarde...' : 'Sauvegarder la config Yas'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'En attente', value: yasStats.pending || 0, color: '#818CF8' },
                      { label: 'Approuvées', value: yasStats.approved || 0, color: '#4ADE80' },
                      { label: 'Rejetées', value: yasStats.rejected || 0, color: '#F87171' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-2.5 text-center">
                        <div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[0.55rem] text-[rgba(255,255,255,0.25)] uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {yasDeposits.filter(d => d.status === 'pending').map((d: any) => (
                    <div key={d.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] border-l-[#818CF8] rounded-2xl p-3 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[0.78rem] font-bold text-[#EDEDEF]">{esc(d.user?.name || '?')}</div>
                          <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">{d.amountCfa ? `${d.amountCfa.toLocaleString()} FCFA` : formatMoney(d.amountUsd)} → {d.amountTrx?.toFixed(2)} TRX</div>
                          {d.amountCfa > 0 && <div className="text-[0.6rem] text-[#818CF8]">{formatMoney(d.amountUsd)} USD</div>}
                        </div>
                        <span className="text-[0.6rem] bg-[rgba(99,102,241,0.12)] text-[#6366F1] px-2 py-0.5 rounded-full font-semibold">Yas 🇹🇬</span>
                      </div>
                      <div className="bg-[#161719] rounded-lg p-2.5 mb-2 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Compte Yas client</span>
                          <span className="text-[0.7rem] font-bold text-[#EDEDEF]">{esc(d.yasAccount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Adresse TRX</span>
                          <button onClick={async () => { try { await navigator.clipboard.writeText(d.trxAddress || ''); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur de copie', 'error'); } }} className="text-[0.6rem] text-[#6366F1] hover:text-[#818CF8] cursor-pointer bg-transparent border-none flex items-center gap-1"><i className="fas fa-copy text-[0.55rem]"></i> Copier</button>
                        </div>
                        <div className="text-[0.72rem] font-mono font-bold text-[#818CF8] break-all leading-relaxed mt-1">{esc(d.trxAddress || 'Non renseigné')}</div>
                      </div>
                      <div className="mb-2">
                        <input type="text" value={yasNote[d.id] || ''} onChange={(e) => setYasNote(prev => ({ ...prev, [d.id]: e.target.value }))} placeholder="Note admin (optionnel)" className="w-full py-2 px-3 bg-[#161719] border-[1px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.72rem] text-white outline-none focus:border-[#6366F1]" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => { const r = await authFetch('/api/admin/yas-deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve', adminNote: yasNote[d.id] || 'Conversion effectuée. TRX envoyé à votre adresse.' }) }); const data = await r.json(); if (data.success) { addToast('Approuvé - TRX crédités', 'success'); loadYasDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"><i className="fas fa-check mr-1"></i>Approuver</button>
                        <button onClick={async () => { const r = await authFetch('/api/admin/yas-deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject', adminNote: yasNote[d.id] || undefined }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadYasDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button>
                      </div>
                    </div>
                  ))}
                  {yasDeposits.filter(d => d.status === 'pending').length === 0 && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-2"><i className="fas fa-check-circle text-[#6366F1] text-[1.2rem]"></i></div>
                      <p className="text-[0.82rem] text-[rgba(255,255,255,0.25)]">Aucune conversion Yas en attente</p>
                    </div>
                  )}
                </>
              )}

              {/* ========== WITHDRAWALS TAB — ENHANCED ========== */}
              {tab === 'withdrawals' && (
                <>
                  {/* Loading state */}
                  {withdrawalsLoading && (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-3 border-[rgba(255,255,255,0.1)] border-t-[#6366F1] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  )}

                  {/* Error state */}
                  {withdrawalsError && !withdrawalsLoading && (
                    <div className="bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] rounded-2xl p-4 mb-4 text-center">
                      <div className="text-[0.82rem] text-[#F87171] mb-2">⚠️ Erreur: {esc(withdrawalsError)}</div>
                      <button onClick={() => loadWithdrawals()} className="py-2 px-4 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer">Réessayer</button>
                    </div>
                  )}

                  {!withdrawalsLoading && !withdrawalsError && (<>
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-1.5 mb-4">
                    {[
                      { label: 'En attente', value: withdrawalStats.pending || 0, color: '#818CF8', filter: 'pending' as const },
                      { label: 'Approuvés', value: withdrawalStats.approved || 0, color: '#F59E0B', filter: 'approved' as const },
                      { label: 'Exécutés', value: withdrawalStats.executed || 0, color: '#4ADE80', filter: 'executed' as const },
                      { label: 'Rejetés', value: withdrawalStats.rejected || 0, color: '#F87171', filter: 'rejected' as const },
                    ].map((s, i) => (
                      <button key={i} onClick={() => setWithdrawalFilter(s.filter)} className={`bg-[#0E0F11] border rounded-2xl p-2 text-center cursor-pointer transition-all ${withdrawalFilter === s.filter ? 'border-[#6366F1]' : 'border-[rgba(255,255,255,0.06)]'}`}>
                        <div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[0.5rem] text-[rgba(255,255,255,0.25)] uppercase">{s.label}</div>
                      </button>
                    ))}
                  </div>

                  {/* ===== YAS WITHDRAWALS SECTION ===== */}
                  {withdrawalFilter === 'pending' && pendingYasWithdrawals.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-[rgba(74,222,128,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-mobile-alt text-[#4ADE80] text-[0.7rem]"></i></div>
                        <div>
                          <div className="text-[0.82rem] font-bold text-[#EDEDEF]">Retraits Yas 🇹🇬</div>
                          <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)]">Approuvez puis exécutez après envoi des FCFA</div>
                        </div>
                      </div>
                      {pendingYasWithdrawals.map((w: any) => (
                        <div key={w.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] border-l-[#4ADE80] rounded-2xl p-3 mb-3" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-[0.78rem] font-bold text-[#EDEDEF]">{esc(w.user?.name || '?')}</div>
                              <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)]">{esc(w.user?.email || '')}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {w.status === 'pending' && <span className="text-[0.6rem] bg-[rgba(129,140,248,0.12)] text-[#818CF8] px-2 py-0.5 rounded-full font-semibold">En attente</span>}
                              {w.status === 'approved' && <span className="text-[0.6rem] bg-[rgba(245,158,11,0.12)] text-[#F59E0B] px-2 py-0.5 rounded-full font-semibold">Approuvé</span>}
                              <span className="text-[0.6rem] bg-[rgba(74,222,128,0.12)] text-[#4ADE80] px-2 py-0.5 rounded-full font-semibold">Yas 🇹🇬</span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="bg-[#161719] rounded-lg p-2.5 mb-2 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Montant USD</span>
                              <span className="text-[0.82rem] font-black text-[#4ADE80]">{formatMoney(w.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Montant FCFA</span>
                              <span className="text-[0.82rem] font-black text-[#4ADE80]">{(w.amountCfa || 0).toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Numéro Yas</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[0.78rem] font-bold text-[#EDEDEF]">{esc(w.yasAccount || '')}</span>
                                <button onClick={async () => { try { await navigator.clipboard.writeText(w.yasAccount || ''); addToast('Numéro copié !', 'success'); } catch { addToast('Erreur', 'error'); } }} className="text-[0.55rem] text-[#6366F1] cursor-pointer bg-transparent border-none"><i className="fas fa-copy"></i></button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Solde utilisateur</span>
                              <span className="text-[0.72rem] font-bold text-[#EDEDEF]">{formatMoney(w.user?.balance || 0)}</span>
                            </div>
                          </div>

                          {/* USSD Helper for YAS transfer */}
                          {w.status === 'approved' && (
                            <div className="bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.15)] rounded-lg p-2.5 mb-2">
                              <div className="text-[0.7rem] font-bold text-[#4ADE80] mb-1.5"><i className="fas fa-phone-alt mr-1"></i>Envoyez les FCFA via Yas</div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[0.65rem] text-[rgba(255,255,255,0.55)]">Envoyez</span>
                                <span className="text-[0.78rem] font-black text-[#4ADE80]">{(w.amountCfa || 0).toLocaleString('fr-FR')} FCFA</span>
                                <span className="text-[0.65rem] text-[rgba(255,255,255,0.55)]">au</span>
                                <span className="text-[0.78rem] font-black text-[#EDEDEF]">{esc(w.yasAccount || '')}</span>
                              </div>
                              <button
                                onClick={() => {
                                  const ussd = `*145*1*${w.amountCfa}*${w.yasAccount}*2#`;
                                  navigator.clipboard.writeText(ussd).then(() => addToast('Code USSD copié ! Composez-le sur votre téléphone.', 'success')).catch(() => addToast('Erreur de copie', 'error'));
                                }}
                                className="w-full py-2 rounded-lg bg-[#4ADE80] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <i className="fas fa-copy text-[0.65rem]"></i> Copier le code USSD
                              </button>
                              <div className="text-[0.55rem] text-[rgba(255,255,255,0.3)] mt-1.5 text-center">Code: *145*1*{w.amountCfa}*{w.yasAccount}*2#</div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            {w.status === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'approve' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Approuvé — envoyez les FCFA puis exécutez', 'success'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[#F59E0B] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"
                                ><i className="fas fa-check mr-1"></i>Approuver</button>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Rejeté', 'info'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer"
                                >Rejeter</button>
                              </>
                            )}
                            {w.status === 'approved' && (
                              <>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'execute' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Exécuté ! Fonds envoyés et solde débité', 'success'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[#4ADE80] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"
                                ><i className="fas fa-paper-plane mr-1"></i>Exécuter (fonds envoyés)</button>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Rejeté', 'info'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer"
                                >Rejeter</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* ===== TRX WITHDRAWALS SECTION ===== */}
                  {withdrawalFilter === 'pending' && pendingTrxWithdrawals.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3 mt-2">
                        <div className="w-7 h-7 rounded-lg bg-[rgba(129,140,248,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-link text-[#818CF8] text-[0.7rem]"></i></div>
                        <div>
                          <div className="text-[0.82rem] font-bold text-[#EDEDEF]">Retraits TRX</div>
                          <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)]">Approuvez puis exécutez après envoi des TRX</div>
                        </div>
                      </div>
                      {pendingTrxWithdrawals.map((w: any) => (
                        <div key={w.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] border-l-[#818CF8] rounded-2xl p-3 mb-3" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-[0.78rem] font-bold text-[#EDEDEF]">{esc(w.user?.name || '?')}</div>
                              <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)]">{esc(w.user?.email || '')}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {w.status === 'pending' && <span className="text-[0.6rem] bg-[rgba(129,140,248,0.12)] text-[#818CF8] px-2 py-0.5 rounded-full font-semibold">En attente</span>}
                              {w.status === 'approved' && <span className="text-[0.6rem] bg-[rgba(245,158,11,0.12)] text-[#F59E0B] px-2 py-0.5 rounded-full font-semibold">Approuvé</span>}
                              <span className="text-[0.6rem] bg-[rgba(129,140,248,0.12)] text-[#818CF8] px-2 py-0.5 rounded-full">TRX</span>
                            </div>
                          </div>

                          <div className="bg-[#161719] rounded-lg p-2.5 mb-2 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Montant</span>
                              <span className="text-[0.82rem] font-black text-[#818CF8]">{formatMoney(w.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Adresse TRX</span>
                              <button onClick={async () => { try { await navigator.clipboard.writeText(w.trxAddress || ''); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur', 'error'); } }} className="text-[0.55rem] text-[#6366F1] cursor-pointer bg-transparent border-none"><i className="fas fa-copy"></i> Copier</button>
                            </div>
                            <div className="text-[0.68rem] font-mono font-bold text-[#818CF8] break-all leading-relaxed">{esc(w.trxAddress || 'Non renseigné')}</div>
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Solde utilisateur</span>
                              <span className="text-[0.72rem] font-bold text-[#EDEDEF]">{formatMoney(w.user?.balance || 0)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {w.status === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'approve' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Approuvé — envoyez les TRX puis exécutez', 'success'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[#F59E0B] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"
                                ><i className="fas fa-check mr-1"></i>Approuver</button>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Rejeté', 'info'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer"
                                >Rejeter</button>
                              </>
                            )}
                            {w.status === 'approved' && (
                              <>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'execute' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Exécuté ! TRX envoyés et solde débité', 'success'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[#4ADE80] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"
                                ><i className="fas fa-paper-plane mr-1"></i>Exécuter (TRX envoyés)</button>
                                <button
                                  onClick={async () => {
                                    const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }) });
                                    const data = await r.json();
                                    if (data.success) { addToast('Rejeté', 'info'); loadWithdrawals(); } else addToast(data.error, 'error');
                                  }}
                                  className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer"
                                >Rejeter</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* ===== FILTERED LIST (non-pending) ===== */}
                  {withdrawalFilter !== 'pending' && (
                    <>
                      {filteredWithdrawals.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-2"><i className="fas fa-check-circle text-[#6366F1] text-[1.2rem]"></i></div>
                          <p className="text-[0.82rem] text-[rgba(255,255,255,0.25)]">Aucun retrait {withdrawalFilter === 'all' ? '' : withdrawalFilter}</p>
                        </div>
                      ) : (
                        filteredWithdrawals.map((w: any) => (
                          <div key={w.id} className={`bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] rounded-2xl p-3 mb-2 ${w.type === 'yas' ? 'border-l-[#4ADE80]' : 'border-l-[#818CF8]'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div>
                                <div className="text-[0.75rem] font-bold text-[#EDEDEF]">{esc(w.user?.name || '?')}</div>
                                <div className="text-[0.62rem] text-[rgba(255,255,255,0.35)]">{formatMoney(w.amount)} {w.type === 'yas' ? `· ${(w.amountCfa || 0).toLocaleString('fr-FR')} FCFA` : `· TRX`}</div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {w.status === 'executed' && <span className="text-[0.6rem] bg-[rgba(74,222,128,0.12)] text-[#4ADE80] px-2 py-0.5 rounded-full font-semibold">Exécuté</span>}
                                {w.status === 'approved' && <span className="text-[0.6rem] bg-[rgba(245,158,11,0.12)] text-[#F59E0B] px-2 py-0.5 rounded-full font-semibold">Approuvé</span>}
                                {w.status === 'rejected' && <span className="text-[0.6rem] bg-[rgba(248,113,113,0.12)] text-[#F87171] px-2 py-0.5 rounded-full font-semibold">Rejeté</span>}
                                <span className="text-[0.55rem] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] px-1.5 py-0.5 rounded-full">{w.type === 'yas' ? 'Yas' : 'TRX'}</span>
                              </div>
                            </div>
                            {w.type === 'yas' && <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)]">→ {esc(w.yasAccount || '')}</div>}
                            {w.type === 'trx' && <div className="text-[0.6rem] font-mono text-[rgba(255,255,255,0.35)] truncate">→ {esc(w.trxAddress || '')}</div>}
                            {w.adminNote && <div className="text-[0.6rem] text-[rgba(255,255,255,0.3)] mt-1 italic">Note: {esc(w.adminNote)}</div>}
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Empty state for pending filter */}
                  {withdrawalFilter === 'pending' && pendingWithdrawals.length === 0 && approvedWithdrawals.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-3"><i className="fas fa-inbox text-[#6366F1] text-[1.4rem]"></i></div>
                      <p className="text-[0.88rem] font-semibold text-[rgba(255,255,255,0.4)] mb-1">Aucun retrait en attente</p>
                      <p className="text-[0.65rem] text-[rgba(255,255,255,0.25)]">Les nouvelles demandes apparaîtront ici en temps réel</p>
                    </div>
                  )}
                  </>)}
                </>
              )}

              {/* Config Tab */}
              {tab === 'config' && siteConfig && (
                <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
                  <div className="mb-3">
                    <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.45)]">Adresse TRX Admin</label>
                    <input type="text" value={configAddr} onChange={(e) => setConfigAddr(e.target.value)} className="w-full py-3 px-4 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.85rem] text-white outline-none focus:border-[#6366F1]" />
                  </div>
                  <div className="mb-3">
                    <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.45)]">Prix TRX (USD)</label>
                    <input type="number" step="0.001" value={configPrice} onChange={(e) => setConfigPrice(e.target.value)} className="w-full py-3 px-4 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.85rem] text-white outline-none focus:border-[#6366F1]" />
                  </div>
                  <div className="bg-[#161719] rounded-xl p-3 mb-3 border border-[rgba(99,102,241,0.12)]">
                    <div className="text-[0.72rem] font-bold text-[#818CF8] mb-2"><i className="fas fa-exchange-alt mr-1"></i>Config Yas du Togo</div>
                    <div className="mb-3">
                      <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.45)]">Numéro Yas Admin</label>
                      <input type="text" value={configYasAddr} onChange={(e) => setConfigYasAddr(e.target.value)} placeholder="90XXXXXX ou 70XXXXXX" className="w-full py-3 px-4 bg-[#0E0F11] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.85rem] text-white outline-none focus:border-[#6366F1]" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.45)]">Taux CFA/USD (1 USD = ? CFA)</label>
                      <input type="number" step="1" value={configCfaRate} onChange={(e) => setConfigCfaRate(e.target.value)} className="w-full py-3 px-4 bg-[#0E0F11] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.85rem] text-white outline-none focus:border-[#6366F1]" />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setSavingConfig(true);
                      try {
                        const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminTrxAddress: configAddr, trxUsdPrice: configPrice, adminYasAccount: configYasAddr, cfaUsdRate: configCfaRate }) });
                        const d = await r.json();
                        if (d.success) { addToast('Config sauvegardée', 'success'); await loadConfig(); } else addToast(d.error, 'error');
                      } catch { addToast('Erreur', 'error'); }
                      setSavingConfig(false);
                    }}
                    disabled={savingConfig}
                    className="w-full py-3 rounded-xl bg-[#6366F1] text-[#050506] font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {savingConfig ? <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <i className="fas fa-save mr-1"></i>}
                    {savingConfig ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
