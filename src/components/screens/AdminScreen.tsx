'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

interface AdminChatMsg {
  id: string;
  text: string;
  me: boolean;
  isAdmin: boolean;
  isAdminMsg: boolean;
  t: string;
  date?: string;
}

interface Conversation {
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_balance: number;
  user_has_invested: boolean;
  messages: {
    id: string;
    content: string;
    is_admin: boolean;
    time: string;
    date: string;
    timestamp: number;
  }[];
  last_ts: number;
  last_message: {
    id: string;
    content: string;
    is_admin: boolean;
    time: string;
    date: string;
    timestamp: number;
  } | null;
  unread_count: number;
  total_messages: number;
}

export default function AdminScreen() {
  const { user, addToast } = useAppStore();
  const [tab, setTab] = useState<'users' | 'deposits' | 'yas' | 'withdrawals' | 'messages' | 'config'>('users');
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

  // Chat state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AdminChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const lastChatFetchId = useRef<string>('0');
  const socketRef = useRef<Socket | null>(null);
  const selectedUserIdRef = useRef<string | null>(null);

  // Keep selectedUserIdRef in sync with selectedUserId
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

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

  const loadConversations = useCallback(async () => {
    try {
      const r = await authFetch('/api/admin/chats');
      const d = await r.json();
      if (d.success) setConversations(d.conversations || []);
    } catch { /* */ }
  }, []);

  // Connect to Socket.io for real-time messaging
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: {
        userId: user.id,
        userRole: user.role,
        userName: user.name,
      },
      query: { XTransformPort: '3003' },
    });

    socket.on('connect', () => {
      console.log('[ADMIN-CHAT] Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[ADMIN-CHAT] Socket disconnected');
    });

    // Real-time: receive new user messages — uses real DB ID for dedup
    socket.on('new-user-message', (msgData: {
      id: string;
      content: string;
      userId: string;
      userName: string;
      isAdmin: boolean;
      t: string;
      date: string;
    }) => {
      // If we have this conversation open, add the message
      if (selectedUserIdRef.current === msgData.userId) {
        setChatMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          if (existingIds.has(msgData.id)) return prev;
          // Also dedup by content+time for robustness
          if (prev.some(m => m.text === msgData.content && m.t === msgData.t)) return prev;
          return [...prev, {
            id: msgData.id,
            text: msgData.content,
            me: false,
            isAdmin: false,
            isAdminMsg: false,
            t: msgData.t,
            date: msgData.date,
          }];
        });
      }
      // Refresh conversations list to update unread count
      loadConversations();
    });

    // Real-time: see admin messages sent from other admin tabs — uses real DB ID
    socket.on('admin-message-sent', (msgData: {
      id: string;
      content: string;
      userId: string;
      isAdmin: boolean;
      t: string;
      date: string;
    }) => {
      if (selectedUserIdRef.current === msgData.userId) {
        setChatMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          if (existingIds.has(msgData.id)) return prev;
          // Also dedup by content+time
          if (prev.some(m => m.text === msgData.content && m.t === msgData.t)) return prev;
          return [...prev, {
            id: msgData.id,
            text: msgData.content,
            me: true,
            isAdmin: true,
            isAdminMsg: true,
            t: msgData.t,
            date: msgData.date,
          }];
        });
      }
      loadConversations();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const loadChatMessages = useCallback(async (userId: string) => {
    try {
      const r = await authFetch(`/api/chat/messages?userId=${userId}&lastId=${lastChatFetchId.current}`);
      const d = await r.json();
      if (d.success && d.messages?.length > 0) {
        setChatMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          // Dedup by both ID and content+time for robustness
          const newMsgs = d.messages.filter((m: AdminChatMsg) => {
            if (existingIds.has(m.id)) return false;
            if (prev.some(p => p.text === m.text && p.t === m.t)) return false;
            return true;
          });
          if (newMsgs.length > 0) {
            lastChatFetchId.current = newMsgs[newMsgs.length - 1].id;
            return [...prev, ...newMsgs];
          }
          return prev;
        });
      }
    } catch { /* */ }
    setChatLoading(false);
  }, []);

  // Poll chat messages as backup (Socket.io is primary)
  useEffect(() => {
    if (tab === 'messages' && selectedUserId) {
      loadChatMessages(selectedUserId);
      // Reduced polling: every 15 seconds as backup (Socket.io handles real-time)
      const interval = setInterval(() => loadChatMessages(selectedUserId), 15000);
      return () => clearInterval(interval);
    }
  }, [tab, selectedUserId, loadChatMessages]);

  // Load conversations when messages tab is selected (reduced polling)
  useEffect(() => {
    if (tab === 'messages') {
      const load = () => { loadConversations(); };
      load();
      // Reduced polling: every 20 seconds as backup (Socket.io handles real-time)
      const interval = setInterval(load, 20000);
      return () => clearInterval(interval);
    }
  }, [tab, loadConversations]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleAdminReply = async () => {
    const content = chatInput.trim();
    if (!content || !selectedUserId || chatSending) return;
    setChatSending(true);
    setChatInput('');
    try {
      const res = await authFetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUserId, content }),
      });
      const data = await res.json();
      if (data.success) {
        // Add message from server response directly (instant, with real DB ID)
        if (data.message) {
          setChatMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            if (existingIds.has(data.message.id)) return prev;
            return [...prev, data.message];
          });
          lastChatFetchId.current = data.message.id;
        }
        // Emit via Socket.io with real DB ID for real-time delivery to user
        if (socketRef.current?.connected) {
          socketRef.current.emit('admin-reply', {
            id: data.message?.id,
            targetUserId: selectedUserId,
            content,
            adminId: user?.id,
            adminName: user?.name,
            t: data.message?.t,
            date: data.message?.date,
          });
        }
        loadConversations(); // Refresh conversation list
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setChatSending(false);
    chatInputRef.current?.focus();
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await authFetch('/api/admin/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => prev.filter(m => m.id !== messageId));
        addToast('Message supprimé', 'info');
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur', 'error');
    }
  };

  const openConversation = (userId: string) => {
    setSelectedUserId(userId);
    setChatMessages([]);
    lastChatFetchId.current = '0';
    setChatLoading(true);
    loadChatMessages(userId);
  };

  const closeConversation = () => {
    setSelectedUserId(null);
    setChatMessages([]);
    lastChatFetchId.current = '0';
    loadConversations();
  };

  useEffect(() => { const t = setTimeout(() => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); }, 0); return () => clearTimeout(t); }, [loadData, loadDeposits, loadYasDeposits, loadWithdrawals, loadConfig]);

  if (!user || user.role !== 'admin') return null;
  const stats = adminData?.stats || {};
  const usersList = adminData?.users || [];

  const refreshAll = () => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); };

  // Total unread messages
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

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
            { k: 'withdrawals', l: 'Retraits' },
            { k: 'messages', l: `Messages${totalUnread > 0 ? ` (${totalUnread})` : ''}` },
            { k: 'config', l: 'Config' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`flex-1 min-w-0 py-3 text-[0.65rem] font-semibold border-none cursor-pointer transition-all whitespace-nowrap px-1 rounded-none ${
                tab === t.k
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                  : 'text-[rgba(255,255,255,0.45)]'
              }`}
            >
              {t.l}
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
                            const data = await r.json(); if (data.success) { addToast('Approuvé', 'success'); loadDeposits(); } else addToast(data.error, 'error');
                          }}
                          className="flex-1 py-2 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"
                        >Approuver</button>
                        <button
                          onClick={async () => {
                            const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject' }) });
                            const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadDeposits(); } else addToast(data.error, 'error');
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
                  <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.12)] rounded-2xl p-3.5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-cog text-[#6366F1] text-[0.65rem]"></i></div>
                      <div className="text-[0.78rem] font-bold text-[#EDEDEF]">Configuration Yas</div>
                    </div>
                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.7rem] font-semibold text-[rgba(255,255,255,0.45)]">Votre numéro Yas (affiché aux utilisateurs)</label>
                      <input type="text" value={configYasAddr} onChange={(e) => setConfigYasAddr(e.target.value)} placeholder="90XXXXXX ou 70XXXXXX" maxLength={8} className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.82rem] text-white outline-none focus:border-[#6366F1]" />
                      {configYasAddr && !/^(9[0-3]|7[0-3])\d{6}$/.test(configYasAddr.trim()) && (<p className="text-[0.6rem] text-[#F87171] mt-1">Format: 8 chiffres, commence par 90-93 ou 70-73</p>)}
                    </div>
                    <div className="mb-3">
                      <label className="block mb-1 text-[0.7rem] font-semibold text-[rgba(255,255,255,0.45)]">Taux CFA/USD (1 USD = ? CFA)</label>
                      <input type="number" step="1" value={configCfaRate} onChange={(e) => setConfigCfaRate(e.target.value)} className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.82rem] text-white outline-none focus:border-[#6366F1]" />
                    </div>
                    <button onClick={async () => { setSavingYas(true); try { const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminYasAccount: configYasAddr, cfaUsdRate: configCfaRate }) }); const d = await r.json(); if (d.success) { addToast('Config Yas sauvegardée !', 'success'); await loadConfig(); } else addToast(d.error || 'Erreur de sauvegarde', 'error'); } catch { addToast('Erreur réseau', 'error'); } setSavingYas(false); }} disabled={savingYas} className="w-full py-2.5 rounded-lg bg-[#6366F1] text-[#050506] text-[0.78rem] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60">
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
                        <div className="flex items-center gap-1.5">
                          {d.destination === 'trx' ? (
                            <span className="text-[0.6rem] bg-[rgba(245,158,11,0.12)] text-[#F59E0B] px-2 py-0.5 rounded-full font-semibold">→ TRX</span>
                          ) : (
                            <span className="text-[0.6rem] bg-[rgba(34,197,94,0.12)] text-[#22C55E] px-2 py-0.5 rounded-full font-semibold">→ Solde</span>
                          )}
                          <span className="text-[0.6rem] bg-[rgba(99,102,241,0.12)] text-[#6366F1] px-2 py-0.5 rounded-full font-semibold">Yas 🇹🇬</span>
                        </div>
                      </div>
                      <div className="bg-[#161719] rounded-lg p-2.5 mb-2 space-y-1">
                        <div className="flex justify-between items-center"><span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Compte Yas client</span><span className="text-[0.7rem] font-bold text-[#EDEDEF]">{esc(d.yasAccount)}</span></div>
                        {d.destination === 'trx' && d.trxAddress && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Adresse TRX destination</span>
                              <button onClick={async () => { try { await navigator.clipboard.writeText(d.trxAddress || ''); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur de copie', 'error'); } }} className="text-[0.6rem] text-[#6366F1] hover:text-[#818CF8] cursor-pointer bg-transparent border-none flex items-center gap-1"><i className="fas fa-copy text-[0.55rem]"></i> Copier</button>
                            </div>
                            <div className="text-[0.72rem] font-mono font-bold text-[#818CF8] break-all leading-relaxed mt-1">{esc(d.trxAddress)}</div>
                          </>
                        )}
                      </div>
                      <div className="mb-2"><input type="text" value={yasNote[d.id] || ''} onChange={(e) => setYasNote(prev => ({ ...prev, [d.id]: e.target.value }))} placeholder="Note admin (optionnel)" className="w-full py-2 px-3 bg-[#161719] border-[1px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.72rem] text-white outline-none focus:border-[#6366F1]" /></div>
                      <div className="flex gap-2">
                        <button onClick={async () => { const r = await authFetch('/api/admin/yas-deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve', adminNote: yasNote[d.id] || (d.destination === 'trx' ? 'Conversion effectuée. TRX envoyés à votre wallet.' : 'Dépôt validé. Solde principal crédité.') }) }); const data = await r.json(); if (data.success) { addToast(d.destination === 'trx' ? 'Approuvé - TRX à envoyer au wallet' : 'Approuvé - Solde crédité', 'success'); loadYasDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"><i className="fas fa-check mr-1"></i>Approuver</button>
                        <button onClick={async () => { const r = await authFetch('/api/admin/yas-deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject', adminNote: yasNote[d.id] || undefined }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadYasDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button>
                      </div>
                    </div>
                  ))}
                  {yasDeposits.filter(d => d.status === 'pending').length === 0 && (
                    <div className="text-center py-6"><div className="w-12 h-12 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-2"><i className="fas fa-check-circle text-[#6366F1] text-[1.2rem]"></i></div><p className="text-[0.82rem] text-[rgba(255,255,255,0.25)]">Aucune conversion Yas en attente</p></div>
                  )}
                </>
              )}

              {/* Withdrawals Tab */}
              {tab === 'withdrawals' && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'En attente', value: withdrawalStats.pending || 0, color: '#818CF8' },
                      { label: 'Approuvés', value: withdrawalStats.approved || 0, color: '#4ADE80' },
                      { label: 'Rejetés', value: withdrawalStats.rejected || 0, color: '#F87171' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-2.5 text-center">
                        <div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[0.55rem] text-[rgba(255,255,255,0.25)] uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {withdrawals.filter(w => w.status === 'pending').map((w: any) => {
                    const isConvert = w.type === 'convert_trx_tmoney';
                    const isYas = w.type === 'yas';
                    const badgeText = isConvert ? 'TRX→TMoney' : isYas ? 'YAS 🇹🇬' : 'TRX';
                    const badgeColor = isConvert ? '#F59E0B' : '#818CF8';
                    return (
                      <div key={w.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] rounded-2xl p-3 mb-2" style={{ borderLeftColor: badgeColor }}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-[0.78rem] font-bold text-[#EDEDEF]">{esc(w.user?.name || '?')}</div>
                            <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">{formatMoney(w.amount)}</div>
                            {(isConvert || isYas) && w.amountCfa > 0 && (
                              <div className="text-[0.6rem]" style={{ color: badgeColor }}>{(w.amountCfa || 0).toLocaleString('fr-FR')} FCFA</div>
                            )}
                          </div>
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-semibold" style={{ color: badgeColor, background: `${badgeColor}20` }}>
                            {badgeText}
                          </span>
                        </div>
                        <div className="bg-[#161719] rounded-lg p-2.5 mb-2 space-y-1.5">
                          {/* TRX address - shown for all types */}
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">{isConvert ? 'Adresse TRX client' : 'Adresse TRX retrait'}</span>
                              <button onClick={async () => { try { await navigator.clipboard.writeText(w.trxAddress || ''); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur de copie', 'error'); } }} className="text-[0.6rem] text-[#6366F1] hover:text-[#818CF8] cursor-pointer bg-transparent border-none flex items-center gap-1"><i className="fas fa-copy text-[0.55rem]"></i> Copier</button>
                            </div>
                            <div className="text-[0.72rem] font-mono font-bold text-[#818CF8] break-all leading-relaxed mt-0.5">{esc(w.trxAddress || 'Non renseigné')}</div>
                          </div>
                          {/* Yas account - shown for convert and yas types */}
                          {(isConvert || isYas) && w.yasAccount && (
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Numéro Yas</span>
                                <button onClick={async () => { try { await navigator.clipboard.writeText(w.yasAccount || ''); addToast('Numéro copié !', 'success'); } catch { addToast('Erreur de copie', 'error'); } }} className="text-[0.6rem] text-[#F59E0B] hover:text-[#FBBF24] cursor-pointer bg-transparent border-none flex items-center gap-1"><i className="fas fa-copy text-[0.55rem]"></i> Copier</button>
                              </div>
                              <div className="text-[0.82rem] font-bold text-[#F59E0B] mt-0.5">{esc(w.yasAccount)}</div>
                            </div>
                          )}
                          {isConvert && (
                            <div className="bg-[rgba(245,158,11,0.08)] rounded-lg p-2 border border-[rgba(245,158,11,0.15)]">
                              <p className="text-[0.6rem] text-[rgba(255,255,255,0.55)]">
                                <i className="fas fa-info-circle mr-1 text-[#F59E0B]"></i>
                                Vérifiez la réception des TRX, puis envoyez <strong className="text-[#F59E0B]">{(w.amountCfa || 0).toLocaleString('fr-FR')} FCFA</strong> sur le compte Yas du client.
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={async () => { const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'approve' }) }); const data = await r.json(); if (data.success) { addToast('Approuvé', 'success'); loadWithdrawals(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer">Approuver</button>
                          <button onClick={async () => { const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadWithdrawals(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button>
                        </div>
                      </div>
                    );
                  })}
                  {withdrawals.filter(w => w.status === 'pending').length === 0 && (
                    <p className="text-center text-[0.82rem] text-[rgba(255,255,255,0.25)] py-4">Aucun retrait en attente</p>
                  )}
                </>
              )}

              {/* ============ MESSAGES TAB ============ */}
              {tab === 'messages' && (
                <>
                  {selectedUserId ? (
                    /* ========== CHAT VIEW ========== */
                    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 180px)' }}>
                      {/* Chat Header - User info */}
                      <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-3 flex items-center gap-3">
                        <button onClick={closeConversation} className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[rgba(255,255,255,0.45)] cursor-pointer border-none shrink-0">
                          <i className="fas fa-arrow-left text-[0.7rem]"></i>
                        </button>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center text-white text-[0.7rem] font-bold shrink-0">
                          {conversations.find(c => c.user_id === selectedUserId)?.user_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.85rem] font-bold text-[#EDEDEF] truncate">{conversations.find(c => c.user_id === selectedUserId)?.user_name || 'Utilisateur'}</div>
                          <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)] truncate">{conversations.find(c => c.user_id === selectedUserId)?.user_email}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[0.75rem] font-bold text-[#4ADE80]">{formatMoney(conversations.find(c => c.user_id === selectedUserId)?.user_balance || 0)}</div>
                        </div>
                      </div>

                      {/* Messages Area */}
                      <div ref={chatScrollRef} className="flex-1 overflow-y-auto min-h-0 mb-3 space-y-1" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                        {chatLoading && chatMessages.length === 0 && (
                          <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[rgba(255,255,255,0.1)] border-t-[#6366F1] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
                          </div>
                        )}
                        {!chatLoading && chatMessages.length === 0 && (
                          <p className="text-center text-[0.75rem] text-[rgba(255,255,255,0.25)] py-6">Aucun message</p>
                        )}
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.me ? 'justify-end' : 'justify-start'} mt-1 group`}>
                            <div className={`max-w-[80%] relative ${msg.me ? 'order-2' : 'order-1'}`}>
                              <div className={`${
                                msg.me
                                  ? 'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-2xl rounded-br-md'
                                  : 'bg-[#161719] border border-[rgba(255,255,255,0.06)] text-[#EDEDEF] rounded-2xl rounded-bl-md'
                              } px-3.5 py-2.5`}>
                                <p className="text-[0.8rem] leading-relaxed whitespace-pre-wrap break-words">{esc(msg.text)}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-0.5 ${msg.me ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                                <span className="text-[0.5rem] text-[rgba(255,255,255,0.2)]">{msg.t}</span>
                                {msg.me && <i className="fas fa-check-double text-[0.4rem] text-[rgba(99,102,241,0.5)]"></i>}
                              </div>
                              {/* Delete button on hover */}
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[rgba(239,68,68,0.15)] text-[#F87171] text-[0.45rem] flex items-center justify-center border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Supprimer"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                        {chatSending && (
                          <div className="flex justify-end mt-1">
                            <div className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-2xl rounded-br-md px-3.5 py-2.5 opacity-60">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-white" style={{ animation: 'pulse 0.8s infinite' }} />
                                <div className="w-1 h-1 rounded-full bg-white" style={{ animation: 'pulse 0.8s infinite 0.2s' }} />
                                <div className="w-1 h-1 rounded-full bg-white" style={{ animation: 'pulse 0.8s infinite 0.4s' }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input Bar */}
                      <div className="flex items-end gap-2 shrink-0 bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-2">
                        <input
                          ref={chatInputRef}
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdminReply(); } }}
                          placeholder="Répondre..."
                          className="flex-1 py-2.5 px-3 bg-[#161719] border-[1px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.82rem] text-white outline-none focus:border-[#6366F1] placeholder:text-[rgba(255,255,255,0.2)]"
                          disabled={chatSending}
                        />
                        <button
                          onClick={handleAdminReply}
                          disabled={chatSending || !chatInput.trim()}
                          className="w-10 h-10 rounded-xl bg-[#6366F1] text-[#050506] flex items-center justify-center border-none cursor-pointer disabled:opacity-30 shrink-0 transition-all active:scale-90"
                        >
                          <i className="fas fa-paper-plane text-[0.75rem]"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ========== CONVERSATION LIST ========== */
                    <>
                      <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.15)] rounded-2xl p-3 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0">
                          <i className="fas fa-comments text-[#6366F1] text-[0.85rem]"></i>
                        </div>
                        <div>
                          <div className="text-[#EDEDEF] text-[0.85rem] font-bold">Messagerie</div>
                          <div className="text-[rgba(255,255,255,0.45)] text-[0.65rem]">Répondez aux utilisateurs en temps réel</div>
                        </div>
                      </div>

                      {conversations.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-inbox text-[#6366F1] text-[1.2rem]"></i>
                          </div>
                          <p className="text-[0.82rem] text-[rgba(255,255,255,0.25)]">Aucune conversation pour le moment</p>
                          <p className="text-[0.65rem] text-[rgba(255,255,255,0.15)] mt-1">Les messages des utilisateurs apparaîtront ici</p>
                        </div>
                      )}

                      {conversations.map((conv) => (
                        <button
                          key={conv.user_id}
                          onClick={() => openConversation(conv.user_id)}
                          className="w-full bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-2 cursor-pointer transition-all hover:border-[rgba(99,102,241,0.2)] text-left"
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center text-white text-[0.7rem] font-bold">
                                {conv.user_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                              </div>
                              {conv.unread_count > 0 && (
                                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#EF4444] text-white text-[0.55rem] font-bold flex items-center justify-center px-1">
                                  {conv.unread_count}
                                </div>
                              )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[0.82rem] font-bold text-[#EDEDEF] truncate">{esc(conv.user_name || 'Utilisateur')}</span>
                                <span className="text-[0.55rem] text-[rgba(255,255,255,0.2)] shrink-0 ml-2">
                                  {conv.last_message?.time || ''}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[0.68rem] text-[rgba(255,255,255,0.35)] truncate pr-2">
                                  {conv.last_message
                                    ? (conv.last_message.is_admin ? <span className="text-[rgba(99,102,241,0.6)]">Vous : </span> : null)
                                    : null}
                                  {conv.last_message?.content || ''}
                                </p>
                                <span className="text-[0.55rem] text-[rgba(255,255,255,0.15)] shrink-0">{conv.total_messages} msg</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
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
                  <button onClick={async () => { setSavingConfig(true); try { const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminTrxAddress: configAddr, trxUsdPrice: configPrice, adminYasAccount: configYasAddr, cfaUsdRate: configCfaRate }) }); const d = await r.json(); if (d.success) { addToast('Config sauvegardée', 'success'); await loadConfig(); } else addToast(d.error, 'error'); } catch { addToast('Erreur', 'error'); } setSavingConfig(false); }} disabled={savingConfig} className="w-full py-3 rounded-xl bg-[#6366F1] text-[#050506] font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
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
