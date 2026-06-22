'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';
import NotificationBell from '@/components/NotificationBell';
import AdminNotificationBell from '@/components/AdminNotificationBell';

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
  const [tab, setTab] = useState<'users' | 'deposits' | 'yas' | 'withdrawals' | 'messages' | 'notif' | 'videos' | 'config'>('users');
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
  const [configWorldLink, setConfigWorldLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [yasNote, setYasNote] = useState<Record<string, string>>({});
  const [savingYas, setSavingYas] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Admin video links state (Videos tab)
  type AdminVideoLink = {
    id: string;
    youtubeId: string;
    title: string;
    sponsor: string;
    category: string;
    durationMin: number;
    reward: number;
    active: boolean;
    createdAt: string;
  };
  const [adminVideos, setAdminVideos] = useState<AdminVideoLink[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videoUrlOrId, setVideoUrlOrId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSponsor, setVideoSponsor] = useState('');
  const [videoCategory, setVideoCategory] = useState<'chinois' | 'japonais' | 'indien' | 'entreprise'>('entreprise');
  const [videoDuration, setVideoDuration] = useState('5');
  const [videoReward, setVideoReward] = useState('0.20');
  const [addingVideo, setAddingVideo] = useState(false);
  const [togglingVideoId, setTogglingVideoId] = useState<string | null>(null);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [deleteVideoTitle, setDeleteVideoTitle] = useState('');
  const [deletingVideo, setDeletingVideo] = useState(false);

  // Quick message state (Users tab)
  const [messageUserId, setMessageUserId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageSending, setMessageSending] = useState(false);

  // Fund transfer state (Users tab)
  const [transferUserId, setTransferUserId] = useState<string | null>(null);
  const [transferAccount, setTransferAccount] = useState<'tradeBalance' | 'projectBalance'>('tradeBalance');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferSending, setTransferSending] = useState(false);

  // Edit balance state (Users tab) — full draft editor covering ALL user
  // amounts: balance (Solde principal), videoBalance (Vidéo), tradeBalance
  // (Trading), projectBalance (Projet), investBalance (Investissement),
  // gameTotalWon (Gains jeu), videoTotalEarned (Gains vidéo totaux),
  // totalProfit (Profit total), totalLoss (Perte totale), referralCount
  // (Parrainages). On save we POST one update-balance call per changed field.
  type BalanceDraft = {
    balance: string;
    videoBalance: string;
    tradeBalance: string;
    projectBalance: string;
    investBalance: string;
    gameTotalWon: string;
    videoTotalEarned: string;
    totalProfit: string;
    totalLoss: string;
    referralCount: string;
  };
  const [editBalanceUserId, setEditBalanceUserId] = useState<string | null>(null);
  const [editBalanceDraft, setEditBalanceDraft] = useState<BalanceDraft | null>(null);
  const [editBalanceSending, setEditBalanceSending] = useState(false);

  // Broadcasts history state (Notif tab)
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);

  // Delete user state (Users tab)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deletingUser, setDeletingUser] = useState(false);

  // Notification state (Notif tab)
  const [notifTarget, setNotifTarget] = useState<'all' | 'individual'>('all');
  const [notifUserId, setNotifUserId] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');

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
  // New-conversation picker — lets the admin start a chat with ANY user
  // (not just those who already messaged). The admin can search by name/email.
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConvSearch, setNewConvSearch] = useState('');
  // Search filter for the existing conversations list.
  const [convSearch, setConvSearch] = useState('');

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
    try { const r = await authFetch('/api/admin/config'); const d = await r.json(); if (d.success) { setSiteConfig(d.data); setConfigAddr(d.data.adminTrxAddress || ''); setConfigPrice(String(d.data.trxUsdPrice || '')); setConfigYasAddr(d.data.adminYasAccount || ''); setConfigCfaRate(String(d.data.cfaUsdRate || '600')); setConfigWorldLink(d.data.worldLink || ''); } } catch { /* */ }
  }, []);

  const loadAdminVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const r = await authFetch('/api/admin/videos');
      const d = await r.json();
      if (d.success) setAdminVideos(d.data || []);
    } catch { /* */ }
    setVideosLoading(false);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const r = await authFetch('/api/admin/chats');
      const d = await r.json();
      if (d.success) setConversations(d.conversations || []);
    } catch { /* */ }
  }, []);

  const loadBroadcasts = useCallback(async () => {
    setBroadcastsLoading(true);
    try {
      const r = await authFetch('/api/admin/broadcasts');
      const d = await r.json();
      if (d.success) setBroadcasts(d.broadcasts || []);
    } catch { /* */ }
    setBroadcastsLoading(false);
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

  const handleQuickMessage = async (targetUserId: string) => {
    const content = messageInput.trim();
    if (!content || messageSending) return;
    setMessageSending(true);
    try {
      const res = await authFetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, content }),
      });
      const data = await res.json();
      if (data.success) {
        // Emit via Socket.io for real-time delivery to user
        if (socketRef.current?.connected) {
          socketRef.current.emit('admin-reply', {
            id: data.message?.id,
            targetUserId,
            content,
            adminId: user?.id,
            adminName: user?.name,
            t: data.message?.t,
            date: data.message?.date,
          });
        }
        addToast('Message envoyé !', 'success');
        setMessageInput('');
        setMessageUserId(null);
        loadConversations();
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setMessageSending(false);
  };

  const handleAdminTransfer = async (targetUserId: string) => {
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) { addToast('Montant invalide', 'error'); return; }
    if (transferSending) return;
    setTransferSending(true);
    try {
      const res = await authFetch('/api/admin/transfer-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, fromAccount: transferAccount, amount: amt }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Transféré $${amt.toFixed(2)} vers le solde principal`, 'success');
        setTransferAmount('');
        setTransferUserId(null);
        loadData();
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setTransferSending(false);
  };

  const handleEditBalance = async (targetUserId: string) => {
    if (editBalanceSending || !editBalanceDraft) return;
    const fieldLabels: Record<string, string> = {
      balance: 'Solde principal',
      videoBalance: 'Vidéo',
      tradeBalance: 'Trading',
      projectBalance: 'Projet',
      investBalance: 'Investissement',
      gameTotalWon: 'Gains jeu',
      videoTotalEarned: 'Gains vidéo totaux',
      totalProfit: 'Profit total',
      totalLoss: 'Perte totale',
      referralCount: 'Parrainages',
    };
    // Detect changed fields and validate every input (must parse to >=0 numbers).
    type FieldKey = keyof BalanceDraft;
    const changes: { field: FieldKey; amount: number }[] = [];
    for (const k of Object.keys(editBalanceDraft) as FieldKey[]) {
      const raw = editBalanceDraft[k];
      const parsed = parseFloat(raw);
      if (isNaN(parsed) || parsed < 0) {
        addToast(`${fieldLabels[k]} : montant invalide`, 'error');
        return;
      }
      // Compare against the user's current value (from adminData). We treat
      // any numeric difference as a change so trailing zeros don't cause
      // spurious no-op API calls.
      const current = Number((adminData?.users || []).find((u: any) => u.id === targetUserId)?.[k] ?? 0);
      if (Math.abs(parsed - current) > 0.0001) {
        changes.push({ field: k, amount: parsed });
      }
    }
    if (changes.length === 0) {
      addToast('Aucune modification', 'info');
      setEditBalanceUserId(null);
      setEditBalanceDraft(null);
      return;
    }
    setEditBalanceSending(true);
    let failures = 0;
    for (const c of changes) {
      try {
        const res = await authFetch('/api/admin/update-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: targetUserId, field: c.field, amount: c.amount }),
        });
        const data = await res.json();
        if (!data.success) {
          failures++;
          addToast(`${fieldLabels[c.field]} : ${data.error || 'Erreur'}`, 'error');
        }
      } catch {
        failures++;
        addToast(`${fieldLabels[c.field]} : erreur réseau`, 'error');
      }
    }
    if (failures === 0) {
      addToast(`${changes.length} solde(s) mis à jour`, 'success');
    } else if (failures < changes.length) {
      addToast(`${changes.length - failures}/${changes.length} mis à jour`, 'info');
    }
    setEditBalanceSending(false);
    setEditBalanceUserId(null);
    setEditBalanceDraft(null);
    loadData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (deletingUser) return;
    setDeletingUser(true);
    try {
      const res = await authFetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Utilisateur ${deleteUserName} supprimé`, 'success');
        setDeleteUserId(null);
        setDeleteUserName('');
        loadData();
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setDeletingUser(false);
  };

  const handleAddVideo = async () => {
    if (!videoUrlOrId.trim() || !videoTitle.trim() || !videoSponsor.trim()) {
      addToast('Lien/ID, titre et entreprise sont requis', 'error');
      return;
    }
    if (addingVideo) return;
    setAddingVideo(true);
    try {
      const res = await authFetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeIdOrUrl: videoUrlOrId.trim(),
          title: videoTitle.trim(),
          sponsor: videoSponsor.trim(),
          category: videoCategory,
          durationMin: Number(videoDuration) || 5,
          reward: Number(videoReward) || 0,
          active: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Vidéo ajoutée', 'success');
        setVideoUrlOrId('');
        setVideoTitle('');
        setVideoSponsor('');
        setVideoCategory('entreprise');
        setVideoDuration('5');
        setVideoReward('0.20');
        loadAdminVideos();
      } else {
        addToast(data.error || data.message || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setAddingVideo(false);
  };

  const handleToggleVideoActive = async (v: AdminVideoLink) => {
    if (togglingVideoId) return;
    setTogglingVideoId(v.id);
    // Optimistic UI update
    setAdminVideos(prev => prev.map(x => x.id === v.id ? { ...x, active: !x.active } : x));
    try {
      const res = await authFetch(`/api/admin/videos/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !v.active }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(v.active ? 'Vidéo désactivée' : 'Vidéo activée', 'info');
      } else {
        // Roll back
        setAdminVideos(prev => prev.map(x => x.id === v.id ? { ...x, active: v.active } : x));
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      setAdminVideos(prev => prev.map(x => x.id === v.id ? { ...x, active: v.active } : x));
      addToast('Erreur réseau', 'error');
    }
    setTogglingVideoId(null);
  };

  const handleDeleteVideo = async () => {
    if (!deleteVideoId || deletingVideo) return;
    setDeletingVideo(true);
    try {
      const res = await authFetch(`/api/admin/videos/${deleteVideoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Vidéo supprimée', 'success');
        setDeleteVideoId(null);
        setDeleteVideoTitle('');
        loadAdminVideos();
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setDeletingVideo(false);
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      addToast('Titre et message requis', 'error');
      return;
    }
    if (notifTarget === 'individual' && !notifUserId) {
      addToast('Sélectionnez un utilisateur', 'error');
      return;
    }
    if (notifSending) return;
    setNotifSending(true);
    try {
      const res = await authFetch('/api/admin/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: notifTarget,
          userId: notifTarget === 'individual' ? notifUserId : undefined,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: notifTarget === 'all' ? 'admin_broadcast' : 'admin_individual',
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Notification envoyée !', 'success');
        setNotifTitle('');
        setNotifMessage('');
        if (notifTarget === 'all') {
          setNotifTarget('all');
          setNotifUserId('');
        }
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setNotifSending(false);
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

  useEffect(() => { const t = setTimeout(() => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); loadAdminVideos(); loadBroadcasts(); }, 0); return () => clearTimeout(t); }, [loadData, loadDeposits, loadYasDeposits, loadWithdrawals, loadConfig, loadAdminVideos, loadBroadcasts]);

  if (!user || user.role !== 'admin') return null;
  const stats = adminData?.stats || {};
  const usersList = adminData?.users || [];

  const refreshAll = () => { loadData(); loadDeposits(); loadYasDeposits(); loadWithdrawals(); loadConfig(); loadAdminVideos(); loadBroadcasts(); };

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
          <div className="flex items-center gap-1.5">
            <NotificationBell dark />
            <AdminNotificationBell dark />
            <button
              onClick={refreshAll}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none"
            >
              <i className="fas fa-sync-alt text-[0.7rem]"></i>
            </button>
          </div>
        }
      />
      <div className="flex-1 w-full overflow-y-auto min-h-0">
        {/* Tabs */}
        <div className="flex bg-[#0E0F11] border-b border-[rgba(255,255,255,0.06)] px-1 overflow-x-auto">
          {([
            { k: 'users', l: 'Users', icon: '' },
            { k: 'deposits', l: 'Dépôts TRX', icon: '' },
            { k: 'yas', l: 'Yas 🇹🇬', icon: '' },
            { k: 'withdrawals', l: 'Retraits', icon: '' },
            { k: 'messages', l: `Messages${totalUnread > 0 ? ` (${totalUnread})` : ''}`, icon: '' },
            { k: 'notif', l: 'Notifs', icon: '' },
            { k: 'videos', l: 'Vidéos', icon: 'fas fa-video' },
            { k: 'config', l: 'Config', icon: '' },
          ] as { k: string; l: string; icon: string }[]).map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`flex-1 min-w-0 py-3 text-[0.65rem] font-semibold border-none cursor-pointer transition-all whitespace-nowrap px-1 rounded-none ${
                tab === t.k
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                  : 'text-[rgba(255,255,255,0.45)]'
              }`}
            >
              {t.icon && <i className={`${t.icon} mr-1 text-[0.6rem]`}></i>}
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
                      { label: 'Total solde', value: formatMoney(stats.total_balance || 0), color: '#4ADE80' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 text-center">
                        <div className="text-[0.9rem] font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[0.6rem] text-[rgba(255,255,255,0.25)] uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {usersList.map((u: any) => {
                    const levelLabel = u.unlockedLevel >= 3 ? 'Niv. 3 — Elite' : u.unlockedLevel === 2 ? 'Niv. 2 — Business' : 'Niv. 1 — Débutant';
                    const levelColor = u.unlockedLevel >= 3 ? '#F59E0B' : u.unlockedLevel === 2 ? '#14B8A6' : '#22C55E';
                    const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    return (
                    <div key={u.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-2">
                      {/* Header: name + email + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.82rem] font-bold text-[#EDEDEF] flex items-center flex-wrap gap-1.5">
                            {esc(u.name)}
                            {u.role === 'admin' && (
                              <span className="text-[0.55rem] bg-[rgba(99,102,241,0.12)] text-[#6366F1] px-1.5 py-0.5 rounded-full">Admin</span>
                            )}
                            <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${levelColor}1A`, color: levelColor }}>
                              <i className="fas fa-medal text-[0.45rem] mr-0.5"></i>{levelLabel}
                            </span>
                          </div>
                          <div className="text-[0.66rem] text-[rgba(255,255,255,0.4)] truncate">{esc(u.email)}</div>
                          <div className="text-[0.55rem] text-[rgba(255,255,255,0.3)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span title="Code de parrainage"><i className="fas fa-key text-[0.45rem] mr-0.5 text-[#818CF8]"></i><span className="font-mono">{esc(u.referralCode || '—')}</span></span>
                            <span><i className="fas fa-users text-[0.45rem] mr-0.5 text-[#818CF8]"></i>{u.referralCount || 0} parrainé{(u.referralCount || 0) > 1 ? 's' : ''}</span>
                            <span><i className="fas fa-calendar text-[0.45rem] mr-0.5 text-[#818CF8]"></i>{created}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                if (editBalanceUserId === u.id) {
                                  setEditBalanceUserId(null); setEditBalanceDraft(null);
                                } else {
                                  setEditBalanceUserId(u.id);
                                  setEditBalanceDraft({
                                    balance: String(u.balance ?? 0),
                                    videoBalance: String(u.videoBalance ?? 0),
                                    tradeBalance: String(u.tradeBalance ?? 0),
                                    projectBalance: String(u.projectBalance ?? 0),
                                    investBalance: String(u.investBalance ?? 0),
                                    gameTotalWon: String(u.gameTotalWon ?? 0),
                                    videoTotalEarned: String(u.videoTotalEarned ?? 0),
                                    totalProfit: String(u.totalProfit ?? 0),
                                    totalLoss: String(u.totalLoss ?? 0),
                                    referralCount: String(u.referralCount ?? 0),
                                  });
                                }
                                setTransferUserId(null);
                                setMessageUserId(null);
                              }}
                              className="w-7 h-7 rounded-lg bg-[rgba(251,191,36,0.12)] flex items-center justify-center text-[#FBBF24] cursor-pointer border-none shrink-0 hover:bg-[rgba(251,191,36,0.2)] transition-colors"
                              title="Modifier les soldes"
                            >
                              <i className="fas fa-pen text-[0.55rem]"></i>
                            </button>
                            {u.role !== 'admin' && (
                              <>
                                <button
                                  onClick={() => { setTransferUserId(transferUserId === u.id ? null : u.id); setMessageUserId(null); setEditBalanceUserId(null); setEditBalanceDraft(null); }}
                                  className="w-7 h-7 rounded-lg bg-[rgba(34,197,94,0.12)] flex items-center justify-center text-[#4ADE80] cursor-pointer border-none shrink-0 hover:bg-[rgba(34,197,94,0.2)] transition-colors"
                                  title="Transférer vers Principal"
                                >
                                  <i className="fas fa-exchange-alt text-[0.55rem]"></i>
                                </button>
                                <button
                                  onClick={() => { setMessageUserId(messageUserId === u.id ? null : u.id); setTransferUserId(null); setEditBalanceUserId(null); setEditBalanceDraft(null); }}
                                  className="w-7 h-7 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center text-[#6366F1] cursor-pointer border-none shrink-0 hover:bg-[rgba(99,102,241,0.2)] transition-colors"
                                  title="Envoyer un message"
                                >
                                  <i className="fas fa-comment text-[0.6rem]"></i>
                                </button>
                                <button
                                  onClick={() => { setDeleteUserId(u.id); setDeleteUserName(u.name); }}
                                  className="w-7 h-7 rounded-lg bg-[rgba(248,113,113,0.12)] flex items-center justify-center text-[#F87171] cursor-pointer border-none shrink-0 hover:bg-[rgba(248,113,113,0.2)] transition-colors"
                                  title="Supprimer cet utilisateur"
                                >
                                  <i className="fas fa-trash text-[0.55rem]"></i>
                                </button>
                              </>
                            )}
                          </div>
                      </div>
                      {/* Balances grid — 4 wallet accounts in a clean 2x2 layout */}
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                        {([
                          { label: 'Solde principal', val: u.balance ?? 0, color: '#22C55E', icon: 'fa-wallet' },
                          { label: 'Vidéo', val: u.videoBalance ?? 0, color: '#14B8A6', icon: 'fa-video' },
                          { label: 'Trading', val: u.tradeBalance ?? 0, color: '#F59E0B', icon: 'fa-bolt' },
                          { label: 'Projet', val: u.projectBalance ?? 0, color: '#8B5CF6', icon: 'fa-building' },
                        ]).map((b) => (
                          <div key={b.label} className="bg-[#161719] rounded-lg p-2 border-l-[3px]" style={{ borderLeftColor: b.color }}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <i className={`fas ${b.icon} text-[0.5rem]`} style={{ color: b.color }}></i>
                              <span className="text-[0.5rem] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.3px] font-semibold">{b.label}</span>
                            </div>
                            <div className="text-[0.78rem] font-bold text-[#EDEDEF]">{formatMoney(b.val)}</div>
                          </div>
                        ))}
                      </div>
                      {/* Secondary amounts row — investBalance, gameTotalWon, totalProfit, totalLoss, referralCount */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
                        {([
                          { label: 'Invest.', val: formatMoney(u.investBalance ?? 0), color: '#3B82F6', icon: 'fa-chart-line' },
                          { label: 'Jeu', val: formatMoney(u.gameTotalWon ?? 0), color: '#EC4899', icon: 'fa-dice' },
                          { label: 'Vidéo tot.', val: formatMoney(u.videoTotalEarned ?? 0), color: '#06B6D4', icon: 'fa-film' },
                          { label: 'Profit', val: formatMoney(u.totalProfit ?? 0), color: '#10B981', icon: 'fa-arrow-trend-up' },
                          { label: 'Perte', val: formatMoney(u.totalLoss ?? 0), color: '#EF4444', icon: 'fa-arrow-trend-down' },
                          { label: 'Parrainages', val: String(u.referralCount ?? 0), color: '#818CF8', icon: 'fa-users' },
                        ]).map((s) => (
                          <div key={s.label} className="flex items-center gap-1">
                            <i className={`fas ${s.icon} text-[0.45rem]`} style={{ color: s.color }}></i>
                            <span className="text-[0.5rem] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.3px] font-semibold">{s.label}:</span>
                            <span className="text-[0.62rem] font-bold text-[#EDEDEF]">{s.val}</span>
                          </div>
                        ))}
                      </div>
                      {/* Inline fund transfer */}
                      {transferUserId === u.id && (
                        <div className="mt-2.5 pt-2.5 border-t border-[rgba(255,255,255,0.06)]">
                          <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)] mb-2 font-semibold">Transférer vers le solde principal</div>
                          <div className="flex gap-2 mb-2">
                            {([
                              { key: 'tradeBalance' as const, label: 'Trading', bal: u.tradeBalance || 0, color: '#F59E0B' },
                              { key: 'projectBalance' as const, label: 'Projet', bal: u.projectBalance || 0, color: '#8B5CF6' },
                            ]).map(acc => (
                              <button key={acc.key} onClick={() => setTransferAccount(acc.key)}
                                className={`flex-1 py-1.5 rounded-lg text-[0.6rem] font-semibold border-none cursor-pointer transition-all ${
                                  transferAccount === acc.key ? 'bg-[#6366F1] text-white' : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)]'
                                }`}
                              >
                                {acc.label}<br/><span className="text-[0.5rem]">{formatMoney(acc.bal)}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number" step="0.01" value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              placeholder="Montant $"
                              className="flex-1 py-2 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.75rem] text-white outline-none focus:border-[#4ADE80]"
                            />
                            <button
                              onClick={() => handleAdminTransfer(u.id)}
                              disabled={transferSending || !transferAmount || parseFloat(transferAmount) <= 0}
                              className="px-3 py-2 rounded-lg bg-[#22C55E] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {transferSending ? (
                                <div className="w-3.5 h-3.5 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                              ) : (
                                <i className="fas fa-arrow-right text-[0.6rem]"></i>
                              )}
                            </button>
                            <button
                              onClick={() => { setTransferUserId(null); setTransferAmount(''); }}
                              className="px-2 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] text-[0.72rem] border-none cursor-pointer"
                            >
                              <i className="fas fa-times text-[0.6rem]"></i>
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Inline message input */}
                      {messageUserId === u.id && (
                        <div className="mt-2.5 pt-2.5 border-t border-[rgba(255,255,255,0.06)]">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickMessage(u.id); }}
                              placeholder="Tapez votre message..."
                              className="flex-1 py-2 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.75rem] text-white outline-none focus:border-[#6366F1]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleQuickMessage(u.id)}
                              disabled={messageSending || !messageInput.trim()}
                              className="px-3 py-2 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {messageSending ? (
                                <div className="w-3.5 h-3.5 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                              ) : (
                                <i className="fas fa-paper-plane text-[0.6rem]"></i>
                              )}
                            </button>
                            <button
                              onClick={() => { setMessageUserId(null); setMessageInput(''); }}
                              className="px-2 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] text-[0.72rem] border-none cursor-pointer"
                            >
                              <i className="fas fa-times text-[0.6rem]"></i>
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Inline edit balance — full draft editor (ALL amounts) */}
                      {editBalanceUserId === u.id && editBalanceDraft && (
                        <div className="mt-2.5 pt-2.5 border-t border-[rgba(255,255,255,0.06)]">
                          <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)] mb-2 font-semibold flex items-center gap-1">
                            <i className="fas fa-pen text-[0.5rem] text-[#FBBF24]"></i>
                            Modifier les soldes — modifiez chaque champ puis enregistrez
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {([
                              { key: 'balance' as const, label: 'Solde principal', color: '#22C55E', icon: 'fa-wallet' },
                              { key: 'videoBalance' as const, label: 'Vidéo', color: '#14B8A6', icon: 'fa-video' },
                              { key: 'tradeBalance' as const, label: 'Trading', color: '#F59E0B', icon: 'fa-bolt' },
                              { key: 'projectBalance' as const, label: 'Projet', color: '#8B5CF6', icon: 'fa-building' },
                              { key: 'investBalance' as const, label: 'Investissement', color: '#3B82F6', icon: 'fa-chart-line' },
                              { key: 'gameTotalWon' as const, label: 'Gains jeu', color: '#EC4899', icon: 'fa-dice' },
                              { key: 'videoTotalEarned' as const, label: 'Gains vidéo totaux', color: '#06B6D4', icon: 'fa-film' },
                              { key: 'totalProfit' as const, label: 'Profit total', color: '#10B981', icon: 'fa-arrow-trend-up' },
                              { key: 'totalLoss' as const, label: 'Perte totale', color: '#EF4444', icon: 'fa-arrow-trend-down' },
                              { key: 'referralCount' as const, label: 'Parrainages', color: '#818CF8', icon: 'fa-users' },
                            ]).map(acc => (
                              <div key={acc.key} className="bg-[#161719] rounded-lg p-2 border-l-[3px]" style={{ borderLeftColor: acc.color }}>
                                <div className="flex items-center gap-1 mb-1">
                                  <i className={`fas ${acc.icon} text-[0.5rem]`} style={{ color: acc.color }}></i>
                                  <span className="text-[0.55rem] text-[rgba(255,255,255,0.55)] font-semibold uppercase tracking-[0.3px]">{acc.label}</span>
                                </div>
                                <input
                                  type="number" step={acc.key === 'referralCount' ? '1' : '0.01'} min="0"
                                  value={editBalanceDraft[acc.key]}
                                  onChange={(e) => setEditBalanceDraft(prev => prev ? { ...prev, [acc.key]: e.target.value } : prev)}
                                  placeholder="0.00"
                                  className="w-full py-1.5 px-2 bg-[#0E0F11] border-[1px] border-[rgba(255,255,255,0.06)] rounded-md text-[0.78rem] text-white outline-none focus:border-[#FBBF24]"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditBalance(u.id)}
                              disabled={editBalanceSending}
                              className="flex-1 py-2.5 rounded-lg bg-[#FBBF24] text-[#050506] text-[0.78rem] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {editBalanceSending ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                                  Enregistrement...
                                </>
                              ) : (
                                <><i className="fas fa-check text-[0.65rem]"></i> Enregistrer les modifications</>
                              )}
                            </button>
                            <button
                              onClick={() => { setEditBalanceUserId(null); setEditBalanceDraft(null); }}
                              className="px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] text-[0.72rem] border-none cursor-pointer"
                            >
                              <i className="fas fa-times text-[0.65rem]"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
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
                  {pendingDeposits.filter(d => d.status === 'pending').map((d: any) => {
                    const isInvestment = d.type === 'investment';
                    const invLevel = d.investmentLevel;
                    const invAmount = d.investmentAmount ?? d.amountUsd;
                    return (
                    <div key={d.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] rounded-2xl p-3 mb-2" style={{ borderLeftColor: isInvestment ? '#22C55E' : '#6366F1' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[0.78rem] font-bold text-[#EDEDEF] flex items-center gap-1.5 flex-wrap">
                            {esc(d.user?.name || '?')}
                            {isInvestment && (
                              <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.14)', color: '#22C55E' }}>
                                <i className="fas fa-chart-line text-[0.45rem]"></i>Investissement{invLevel ? ` Niv. ${invLevel}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">{formatMoney(invAmount)}{isInvestment ? ' (investi)' : ''} → {d.amountTrx?.toFixed(2)} TRX</div>
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
                      {isInvestment && (
                        <div className="bg-[rgba(34,197,94,0.08)] rounded-lg p-2 mb-2 border border-[rgba(34,197,94,0.15)]">
                          <p className="text-[0.6rem] text-[rgba(34,197,94,0.85)]">
                            <i className="fas fa-info-circle mr-1"></i>
                            L'approbation crée l'investissement <strong>Niv. {invLevel ?? 1}</strong> de <strong>{formatMoney(invAmount)}</strong> et démarre le compte à rebours (24h → première collecte).
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve' }) });
                            const data = await r.json(); if (data.success) { addToast(data.message || 'Approuvé', 'success'); loadDeposits(); } else addToast(data.error, 'error');
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
                    );
                  })}
                  {pendingDeposits.filter(d => d.status === 'pending').length === 0 && (
                    <p className="text-center text-[0.82rem] text-[rgba(255,255,255,0.25)] py-4">Aucun dépôt TRX en attente</p>
                  )}
                </>
              )}

              {/* Yas du Togo Tab */}
              {tab === 'yas' && (
                <>
                  <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.15)] rounded-2xl p-3 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                      <i className="fas fa-mobile-alt text-[#22C55E] text-[0.9rem]"></i>
                    </div>
                    <div>
                      <div className="text-[#EDEDEF] text-[0.85rem] font-bold">Dépôts Yas</div>
                      <div className="text-[rgba(255,255,255,0.45)] text-[0.65rem]">Approuvez pour créditer le solde principal</div>
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
                  {yasDeposits.filter(d => d.status === 'pending').map((d: any) => {
                    const isInvestment = d.type === 'investment';
                    const invLevel = d.investmentLevel;
                    const invAmount = d.investmentAmount ?? d.amountUsd;
                    return (
                    <div key={d.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] rounded-2xl p-3 mb-2" style={{ borderLeftColor: isInvestment ? '#22C55E' : '#818CF8' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[0.78rem] font-bold text-[#EDEDEF] flex items-center gap-1.5 flex-wrap">
                            {esc(d.user?.name || '?')}
                            {isInvestment && (
                              <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.14)', color: '#22C55E' }}>
                                <i className="fas fa-chart-line text-[0.45rem]"></i>Investissement{invLevel ? ` Niv. ${invLevel}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">{d.amountCfa ? `${d.amountCfa.toLocaleString()} FCFA` : formatMoney(d.amountUsd)} → {d.amountTrx?.toFixed(2)} TRX</div>
                          {d.amountCfa > 0 && <div className="text-[0.6rem] text-[#818CF8]">{formatMoney(d.amountUsd)} USD{isInvestment ? ' (investi)' : ''}</div>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-semibold" style={{ background: isInvestment ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                            {isInvestment ? '→ Invest.' : '→ Solde'}
                          </span>
                          <span className="text-[0.6rem] bg-[rgba(99,102,241,0.12)] text-[#6366F1] px-2 py-0.5 rounded-full font-semibold">Yas 🇹🇬</span>
                        </div>
                      </div>
                      <div className="bg-[#161719] rounded-lg p-2.5 mb-2 space-y-1">
                        <div className="flex justify-between items-center"><span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Compte Yas client</span><span className="text-[0.7rem] font-bold text-[#EDEDEF]">{esc(d.yasAccount)}</span></div>
                      </div>
                      {isInvestment && (
                        <div className="bg-[rgba(34,197,94,0.08)] rounded-lg p-2 mb-2 border border-[rgba(34,197,94,0.15)]">
                          <p className="text-[0.6rem] text-[rgba(34,197,94,0.85)]">
                            <i className="fas fa-info-circle mr-1"></i>
                            L'approbation crée l'investissement <strong>Niv. {invLevel ?? 1}</strong> de <strong>{formatMoney(invAmount)}</strong> et démarre le compte à rebours (24h → première collecte).
                          </p>
                        </div>
                      )}
                      <div className="mb-2"><input type="text" value={yasNote[d.id] || ''} onChange={(e) => setYasNote(prev => ({ ...prev, [d.id]: e.target.value }))} placeholder="Note admin (optionnel)" className="w-full py-2 px-3 bg-[#161719] border-[1px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.72rem] text-white outline-none focus:border-[#6366F1]" /></div>
                      <div className="flex gap-2">
                        <button onClick={async () => { const r = await authFetch('/api/admin/yas-deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve', adminNote: yasNote[d.id] || (isInvestment ? 'Investissement approuvé. Compte à rebours démarré.' : 'Dépôt validé. Solde principal crédité.') }) }); const data = await r.json(); if (data.success) { addToast(data.message || 'Approuvé', 'success'); loadYasDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#6366F1] text-[#050506] text-[0.72rem] font-bold border-none cursor-pointer"><i className="fas fa-check mr-1"></i>Approuver</button>
                        <button onClick={async () => { const r = await authFetch('/api/admin/yas-deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject', adminNote: yasNote[d.id] || undefined }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadYasDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[rgba(248,113,113,0.15)] text-[#F87171] text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button>
                      </div>
                    </div>
                    );
                  })}
                  {yasDeposits.filter(d => d.status === 'pending').length === 0 && (
                    <div className="text-center py-6"><div className="w-12 h-12 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-2"><i className="fas fa-check-circle text-[#22C55E] text-[1.2rem]"></i></div><p className="text-[0.82rem] text-[rgba(255,255,255,0.25)]">Aucun dépôt Yas en attente</p></div>
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
                    const isYas = w.type === 'yas' || w.type === 'invest_yas';
                    const isInvestment = w.type === 'invest_yas' || w.type === 'invest_trx';
                    const badgeText = isYas ? 'Yas 🇹🇬' : 'TRX';
                    const badgeColor = isYas ? '#22C55E' : '#818CF8';
                    return (
                      <div key={w.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] border-l-[3px] rounded-2xl p-3 mb-2" style={{ borderLeftColor: isInvestment ? '#22C55E' : badgeColor }}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-[0.78rem] font-bold text-[#EDEDEF] flex items-center gap-1.5 flex-wrap">
                              {esc(w.user?.name || '?')}
                              {isInvestment && (
                                <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.14)', color: '#22C55E' }}>
                                  <i className="fas fa-chart-line text-[0.45rem]"></i>Investissement
                                </span>
                              )}
                            </div>
                            <div className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">{formatMoney(w.amount)}</div>
                            {isYas && w.amountCfa > 0 && (
                              <div className="text-[0.6rem]" style={{ color: badgeColor }}>{(w.amountCfa || 0).toLocaleString('fr-FR')} FCFA</div>
                            )}
                          </div>
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-semibold" style={{ color: badgeColor, background: `${badgeColor}20` }}>
                            {badgeText}
                          </span>
                        </div>
                        <div className="bg-[#161719] rounded-lg p-2.5 mb-2 space-y-1.5">
                          {/* TRX address - shown for TRX type */}
                          {!isYas && w.trxAddress && (
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Adresse TRX retrait</span>
                                <button onClick={async () => { try { await navigator.clipboard.writeText(w.trxAddress || ''); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur de copie', 'error'); } }} className="text-[0.6rem] text-[#6366F1] hover:text-[#818CF8] cursor-pointer bg-transparent border-none flex items-center gap-1"><i className="fas fa-copy text-[0.55rem]"></i> Copier</button>
                              </div>
                              <div className="text-[0.72rem] font-mono font-bold text-[#818CF8] break-all leading-relaxed mt-0.5">{esc(w.trxAddress)}</div>
                            </div>
                          )}
                          {/* Yas account - shown for yas type */}
                          {isYas && w.yasAccount && (
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="text-[0.65rem] text-[rgba(255,255,255,0.45)]">Numéro Yas</span>
                                <button onClick={async () => { try { await navigator.clipboard.writeText(w.yasAccount || ''); addToast('Numéro copié !', 'success'); } catch { addToast('Erreur de copie', 'error'); } }} className="text-[0.6rem] text-[#22C55E] hover:text-[#4ADE80] cursor-pointer bg-transparent border-none flex items-center gap-1"><i className="fas fa-copy text-[0.55rem]"></i> Copier</button>
                              </div>
                              <div className="text-[0.82rem] font-bold text-[#22C55E] mt-0.5">{esc(w.yasAccount)}</div>
                            </div>
                          )}
                          {isYas && (
                            <div className="bg-[rgba(34,197,94,0.08)] rounded-lg p-2 border border-[rgba(34,197,94,0.15)]">
                              <p className="text-[0.6rem] text-[rgba(255,255,255,0.55)]">
                                <i className="fas fa-info-circle mr-1 text-[#22C55E]"></i>
                                Envoyez <strong className="text-[#22C55E]">{(w.amountCfa || 0).toLocaleString('fr-FR')} FCFA</strong> sur le compte Yas du client.
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
                      {/* Chat Header - User info (falls back to usersList when starting a brand new conversation) */}
                      {(() => {
                        const conv = conversations.find(c => c.user_id === selectedUserId);
                        const uInfo = conv
                          ? { name: conv.user_name, email: conv.user_email, balance: conv.user_balance }
                          : (() => {
                              const u = usersList.find((x: any) => x.id === selectedUserId);
                              return u ? { name: u.name, email: u.email, balance: u.balance ?? 0 } : { name: null, email: null, balance: 0 };
                            })();
                        const initials = (uInfo.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                        return (
                      <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-3 flex items-center gap-3">
                        <button onClick={closeConversation} className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[rgba(255,255,255,0.45)] cursor-pointer border-none shrink-0">
                          <i className="fas fa-arrow-left text-[0.7rem]"></i>
                        </button>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center text-white text-[0.7rem] font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.85rem] font-bold text-[#EDEDEF] truncate">{esc(uInfo.name || 'Utilisateur')}</div>
                          <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)] truncate">{esc(uInfo.email || '')}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[0.75rem] font-bold text-[#4ADE80]">{formatMoney(uInfo.balance || 0)}</div>
                        </div>
                      </div>
                        );
                      })()}

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
                        <div className="flex-1">
                          <div className="text-[#EDEDEF] text-[0.85rem] font-bold">Messagerie</div>
                          <div className="text-[rgba(255,255,255,0.45)] text-[0.65rem]">Choisissez un utilisateur à qui écrire</div>
                        </div>
                        <button
                          onClick={() => { setShowNewConversation(v => !v); setNewConvSearch(''); }}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.7rem] font-bold border-none cursor-pointer transition-all ${
                            showNewConversation
                              ? 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.65)]'
                              : 'bg-[#6366F1] text-white'
                          }`}
                          title="Démarrer une nouvelle conversation"
                        >
                          <i className="fas fa-plus text-[0.6rem]"></i>
                          {showNewConversation ? 'Annuler' : 'Nouvelle'}
                        </button>
                      </div>

                      {/* New conversation picker — admin chooses any user */}
                      {showNewConversation && (
                        <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.2)] rounded-2xl p-3 mb-4">
                          <div className="text-[0.7rem] font-bold text-[#EDEDEF] mb-2 flex items-center gap-1.5">
                            <i className="fas fa-user-plus text-[#6366F1] text-[0.65rem]"></i>
                            Sélectionner un utilisateur
                          </div>
                          <input
                            type="text"
                            value={newConvSearch}
                            onChange={(e) => setNewConvSearch(e.target.value)}
                            placeholder="Rechercher par nom ou email..."
                            autoFocus
                            className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.78rem] text-white outline-none focus:border-[#6366F1] mb-2"
                          />
                          <div className="max-h-64 overflow-y-auto space-y-1">
                            {usersList
                              .filter((u: any) => u.role !== 'admin')
                              .filter((u: any) => {
                                if (!newConvSearch.trim()) return true;
                                const s = newConvSearch.toLowerCase();
                                return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
                              })
                              .slice(0, 30)
                              .map((u: any) => {
                                const hasConv = conversations.some((c) => c.user_id === u.id);
                                return (
                                  <button
                                    key={u.id}
                                    onClick={() => {
                                      setShowNewConversation(false);
                                      setNewConvSearch('');
                                      setConvSearch('');
                                      openConversation(u.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-left border-none cursor-pointer transition-all bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(99,102,241,0.12)]"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center text-white text-[0.6rem] font-bold shrink-0">
                                      {u.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[0.75rem] font-bold text-[#EDEDEF] truncate">{esc(u.name)}</div>
                                      <div className="text-[0.62rem] text-[rgba(255,255,255,0.35)] truncate">{esc(u.email)}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-[0.65rem] font-bold text-[#4ADE80]">{formatMoney(u.balance || 0)}</div>
                                      {hasConv && <div className="text-[0.5rem] text-[rgba(255,255,255,0.3)]">Conversation existante</div>}
                                    </div>
                                  </button>
                                );
                              })}
                            {usersList
                              .filter((u: any) => u.role !== 'admin')
                              .filter((u: any) => {
                                if (!newConvSearch.trim()) return true;
                                const s = newConvSearch.toLowerCase();
                                return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
                              }).length === 0 && (
                              <p className="text-center text-[0.72rem] text-[rgba(255,255,255,0.3)] py-3">Aucun utilisateur trouvé</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Search filter for existing conversations */}
                      {!showNewConversation && conversations.length > 0 && (
                        <div className="mb-3">
                          <input
                            type="text"
                            value={convSearch}
                            onChange={(e) => setConvSearch(e.target.value)}
                            placeholder="Rechercher une conversation..."
                            className="w-full py-2 px-3 bg-[#0E0F11] border-[1px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.72rem] text-white outline-none focus:border-[#6366F1]"
                          />
                        </div>
                      )}

                      {!showNewConversation && conversations.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-inbox text-[#6366F1] text-[1.2rem]"></i>
                          </div>
                          <p className="text-[0.82rem] text-[rgba(255,255,255,0.25)]">Aucune conversation pour le moment</p>
                          <p className="text-[0.65rem] text-[rgba(255,255,255,0.15)] mt-1">Cliquez sur « Nouvelle » pour démarrer une conversation</p>
                        </div>
                      )}

                      {!showNewConversation && conversations
                        .filter((conv) => {
                          if (!convSearch.trim()) return true;
                          const s = convSearch.toLowerCase();
                          return conv.user_name?.toLowerCase().includes(s) || conv.user_email?.toLowerCase().includes(s);
                        })
                        .map((conv) => (
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

              {/* Notifications Tab */}
              {tab === 'notif' && (
                <>
                  {/* Header card */}
                  <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.15)] rounded-2xl p-3 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0">
                      <i className="fas fa-bell text-[#6366F1] text-[0.9rem]"></i>
                    </div>
                    <div>
                      <div className="text-[#EDEDEF] text-[0.85rem] font-bold">Envoyer des notifications</div>
                      <div className="text-[rgba(255,255,255,0.45)] text-[0.65rem]">Envoyez des notifications aux utilisateurs</div>
                    </div>
                  </div>

                  {/* Target selector */}
                  <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-3">
                    <div className="text-[0.72rem] font-bold text-[#EDEDEF] mb-2.5">Destinataire</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNotifTarget('all')}
                        className={`flex-1 py-2.5 rounded-xl text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${
                          notifTarget === 'all'
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)]'
                        }`}
                      >
                        <i className="fas fa-users mr-1 text-[0.6rem]"></i> Tous les utilisateurs
                      </button>
                      <button
                        onClick={() => setNotifTarget('individual')}
                        className={`flex-1 py-2.5 rounded-xl text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${
                          notifTarget === 'individual'
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)]'
                        }`}
                      >
                        <i className="fas fa-user mr-1 text-[0.6rem]"></i> Un utilisateur
                      </button>
                    </div>
                  </div>

                  {/* Individual user selector */}
                  {notifTarget === 'individual' && (
                    <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-3">
                      <div className="text-[0.72rem] font-bold text-[#EDEDEF] mb-2">Sélectionner l&apos;utilisateur</div>
                      <input
                        type="text"
                        value={notifSearch}
                        onChange={(e) => setNotifSearch(e.target.value)}
                        placeholder="Rechercher par nom ou email..."
                        className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.78rem] text-white outline-none focus:border-[#6366F1] mb-2"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {usersList
                          .filter((u: any) => u.role !== 'admin')
                          .filter((u: any) => {
                            if (!notifSearch.trim()) return true;
                            const search = notifSearch.toLowerCase();
                            return u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
                          })
                          .slice(0, 20)
                          .map((u: any) => (
                            <button
                              key={u.id}
                              onClick={() => { setNotifUserId(u.id); setNotifSearch(''); }}
                              className={`w-full text-left py-2 px-3 rounded-lg text-[0.72rem] border-none cursor-pointer transition-all ${
                                notifUserId === u.id
                                  ? 'bg-[#6366F1] text-white'
                                  : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.65)] hover:bg-[rgba(255,255,255,0.08)]'
                              }`}
                            >
                              <span className="font-semibold">{esc(u.name)}</span>
                              <span className="text-[rgba(255,255,255,0.35)] ml-2">{esc(u.email)}</span>
                            </button>
                          ))}
                      </div>
                      {notifUserId && (
                        <div className="mt-2 flex items-center gap-2 bg-[rgba(99,102,241,0.08)] rounded-lg px-3 py-2">
                          <i className="fas fa-check-circle text-[#6366F1] text-[0.7rem]"></i>
                          <span className="text-[0.72rem] text-[#818CF8] font-semibold">
                            {esc(usersList.find((u: any) => u.id === notifUserId)?.name || 'Utilisateur sélectionné')}
                          </span>
                          <button
                            onClick={() => setNotifUserId('')}
                            className="ml-auto text-[rgba(255,255,255,0.35)] hover:text-[#F87171] cursor-pointer bg-transparent border-none"
                          >
                            <i className="fas fa-times text-[0.6rem]"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notification form */}
                  <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-3">
                    <div className="text-[0.72rem] font-bold text-[#EDEDEF] mb-2.5">Contenu de la notification</div>
                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Titre</label>
                      <input
                        type="text"
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="Ex: Mise à jour importante"
                        maxLength={100}
                        className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.82rem] text-white outline-none focus:border-[#6366F1]"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Message</label>
                      <textarea
                        value={notifMessage}
                        onChange={(e) => setNotifMessage(e.target.value)}
                        placeholder="Tapez votre message ici..."
                        maxLength={500}
                        rows={3}
                        className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.82rem] text-white outline-none focus:border-[#6366F1] resize-none"
                      />
                      <div className="text-right text-[0.55rem] text-[rgba(255,255,255,0.2)] mt-0.5">{notifMessage.length}/500</div>
                    </div>

                    {/* Preview */}
                    {(notifTitle || notifMessage) && (
                      <div className="mb-3 bg-[#161719] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                        <div className="text-[0.55rem] text-[rgba(255,255,255,0.3)] mb-1.5 uppercase font-semibold">Aperçu</div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0 mt-0.5">
                            <i className="fas fa-bell text-[#6366F1] text-[0.65rem]"></i>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[0.75rem] font-bold text-[#EDEDEF]">{notifTitle || 'Titre...'}</div>
                            <div className="text-[0.68rem] text-[rgba(255,255,255,0.5)] mt-0.5 leading-relaxed">{notifMessage || 'Message...'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleSendNotification}
                      disabled={notifSending || !notifTitle.trim() || !notifMessage.trim() || (notifTarget === 'individual' && !notifUserId)}
                      className="w-full py-3 rounded-xl bg-[#6366F1] text-[#050506] text-[0.85rem] font-bold border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {notifSending ? (
                        <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                      ) : (
                        <i className="fas fa-paper-plane text-[0.7rem]"></i>
                      )}
                      {notifSending
                        ? 'Envoi en cours...'
                        : notifTarget === 'all'
                          ? 'Envoyer à tous les utilisateurs'
                          : 'Envoyer à l\'utilisateur'
                      }
                    </button>
                  </div>

                  {/* Broadcast history */}
                  <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mt-2">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-[0.72rem] font-bold text-[#EDEDEF] flex items-center gap-1.5">
                        <i className="fas fa-history text-[#6366F1] text-[0.65rem]"></i>
                        Historique des diffusions
                      </div>
                      <button
                        onClick={loadBroadcasts}
                        disabled={broadcastsLoading}
                        className="text-[0.62rem] text-[rgba(255,255,255,0.45)] hover:text-[#6366F1] cursor-pointer bg-transparent border-none flex items-center gap-1 disabled:opacity-50"
                      >
                        <i className={`fas fa-sync-alt text-[0.55rem] ${broadcastsLoading ? 'fa-spin' : ''}`}></i>
                        Actualiser
                      </button>
                    </div>
                    {broadcastsLoading && broadcasts.length === 0 ? (
                      <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-2 border-[rgba(255,255,255,0.1)] border-t-[#6366F1] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
                      </div>
                    ) : broadcasts.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-inbox text-[rgba(255,255,255,0.15)] text-[1.1rem] mb-1.5"></i>
                        <p className="text-[0.7rem] text-[rgba(255,255,255,0.25)]">Aucune diffusion envoyée pour le moment</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto pr-0.5 space-y-2 [scrollbar-width:thin]">
                        {broadcasts.map((b: any) => {
                          const isAll = b.target === 'all';
                          const targetName = isAll
                            ? 'Tous les utilisateurs'
                            : (usersList.find((u: any) => u.id === b.userId)?.name || 'Utilisateur');
                          const typeBadge: Record<string, { bg: string; color: string; label: string }> = {
                            admin_broadcast: { bg: 'rgba(99,102,241,0.12)', color: '#818CF8', label: 'Diffusion' },
                            admin_individual: { bg: 'rgba(34,197,94,0.12)', color: '#4ADE80', label: 'Individuel' },
                            info: { bg: 'rgba(99,102,241,0.12)', color: '#818CF8', label: 'Info' },
                            promo: { bg: 'rgba(245,158,11,0.12)', color: '#FBBF24', label: 'Promo' },
                            alert: { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: 'Alerte' },
                            maintenance: { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8', label: 'Maintenance' },
                          };
                          const tb = typeBadge[b.type] || typeBadge.info;
                          const date = b.createdAt ? new Date(b.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
                          return (
                            <div key={b.id} className="bg-[#161719] rounded-lg p-2.5 border border-[rgba(255,255,255,0.04)]">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="text-[0.74rem] font-bold text-[#EDEDEF] flex-1 min-w-0">{esc(b.title || 'Sans titre')}</div>
                                <span className="shrink-0 text-[0.5rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: tb.bg, color: tb.color }}>{tb.label}</span>
                              </div>
                              <p className="text-[0.66rem] text-[rgba(255,255,255,0.55)] leading-relaxed mb-1.5 line-clamp-2">{esc(b.message || '')}</p>
                              <div className="flex items-center gap-2 text-[0.55rem] text-[rgba(255,255,255,0.3)]">
                                <span className="flex items-center gap-0.5"><i className={`fas ${isAll ? 'fa-users' : 'fa-user'} text-[0.45rem]`}></i>{targetName}</span>
                                <span>·</span>
                                <span className="flex items-center gap-0.5"><i className="fas fa-clock text-[0.45rem]"></i>{date}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                    <div className="text-[0.72rem] font-bold text-[#818CF8] mb-2"><i className="fas fa-globe mr-1"></i>Lien World (10+ parrainés)</div>
                    <div className="mb-2">
                      <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.45)]">URL du lien World</label>
                      <input type="text" value={configWorldLink} onChange={(e) => setConfigWorldLink(e.target.value)} placeholder="https://example.com/world" className="w-full py-3 px-4 bg-[#0E0F11] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.85rem] text-white outline-none focus:border-[#6366F1]" />
                      <p className="text-[0.6rem] text-[rgba(255,255,255,0.3)] mt-1">Ce lien sera visible uniquement pour les utilisateurs ayant 10 parrainés ou plus.</p>
                    </div>
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
                  <button onClick={async () => { setSavingConfig(true); try { const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminTrxAddress: configAddr, trxUsdPrice: configPrice, adminYasAccount: configYasAddr, cfaUsdRate: configCfaRate, worldLink: configWorldLink }) }); const d = await r.json(); if (d.success) { addToast('Config sauvegardée', 'success'); await loadConfig(); } else addToast(d.error, 'error'); } catch { addToast('Erreur', 'error'); } setSavingConfig(false); }} disabled={savingConfig} className="w-full py-3 rounded-xl bg-[#6366F1] text-[#050506] font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
                    {savingConfig ? <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <i className="fas fa-save mr-1"></i>}
                    {savingConfig ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              )}

              {/* Videos Tab */}
              {tab === 'videos' && (
                <>
                  {/* Header card */}
                  <div className="bg-[#0E0F11] border border-[rgba(99,102,241,0.15)] rounded-2xl p-3 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0">
                      <i className="fas fa-video text-[#6366F1] text-[0.9rem]"></i>
                    </div>
                    <div>
                      <div className="text-[#EDEDEF] text-[0.85rem] font-bold">Liens vidéo</div>
                      <div className="text-[rgba(255,255,255,0.45)] text-[0.65rem]">Ajoutez des vidéos YouTube visibles par tous les utilisateurs</div>
                    </div>
                  </div>

                  {/* Add video form */}
                  <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 mb-4">
                    <div className="text-[0.72rem] font-bold text-[#EDEDEF] mb-2.5 flex items-center gap-1.5">
                      <i className="fas fa-plus-circle text-[#6366F1] text-[0.7rem]"></i> Ajouter une vidéo
                    </div>

                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Lien YouTube ou ID vidéo</label>
                      <input
                        type="text"
                        value={videoUrlOrId}
                        onChange={(e) => setVideoUrlOrId(e.target.value)}
                        placeholder="Collez un lien YouTube ou un ID vidéo"
                        className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.78rem] text-white outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Titre <span className="text-[#F87171]">*</span></label>
                      <input
                        type="text"
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="Titre conforme à la vidéo"
                        maxLength={150}
                        className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.78rem] text-white outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Entreprise / Sponsor <span className="text-[#F87171]">*</span></label>
                      <input
                        type="text"
                        value={videoSponsor}
                        onChange={(e) => setVideoSponsor(e.target.value)}
                        placeholder="Nom de l'entreprise"
                        maxLength={100}
                        className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.78rem] text-white outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="mb-2.5">
                      <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Catégorie</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { v: 'chinois', l: 'Chinois' },
                          { v: 'japonais', l: 'Japonais' },
                          { v: 'indien', l: 'Indien' },
                          { v: 'entreprise', l: 'Entreprise' },
                        ] as const).map(c => (
                          <button
                            key={c.v}
                            onClick={() => setVideoCategory(c.v)}
                            className={`py-2 rounded-lg text-[0.6rem] font-semibold border-none cursor-pointer transition-all ${
                              videoCategory === c.v
                                ? 'bg-[#6366F1] text-white'
                                : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)]'
                            }`}
                          >
                            {c.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Durée (min)</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={videoDuration}
                          onChange={(e) => setVideoDuration(e.target.value)}
                          className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.78rem] text-white outline-none focus:border-[#6366F1]"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[0.65rem] font-semibold text-[rgba(255,255,255,0.45)]">Récompense (USD)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={videoReward}
                          onChange={(e) => setVideoReward(e.target.value)}
                          className="w-full py-2.5 px-3 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-lg text-[0.78rem] text-white outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddVideo}
                      disabled={addingVideo || !videoUrlOrId.trim() || !videoTitle.trim() || !videoSponsor.trim()}
                      className="w-full py-3 rounded-xl bg-[#6366F1] text-[#050506] text-[0.85rem] font-bold border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {addingVideo ? (
                        <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                      ) : (
                        <i className="fas fa-plus text-[0.7rem]"></i>
                      )}
                      {addingVideo ? 'Ajout en cours...' : 'Ajouter la vidéo'}
                    </button>
                  </div>

                  {/* Video list header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[0.72rem] font-bold text-[#EDEDEF]">
                      <i className="fas fa-list text-[#6366F1] text-[0.65rem] mr-1.5"></i>
                      Vidéos ({adminVideos.length})
                    </div>
                    <button
                      onClick={loadAdminVideos}
                      disabled={videosLoading}
                      className="text-[0.62rem] text-[rgba(255,255,255,0.45)] hover:text-[#6366F1] cursor-pointer bg-transparent border-none flex items-center gap-1 disabled:opacity-50"
                    >
                      <i className={`fas fa-sync-alt text-[0.55rem] ${videosLoading ? 'fa-spin' : ''}`}></i>
                      Actualiser
                    </button>
                  </div>

                  {videosLoading && adminVideos.length === 0 ? (
                    <div className="flex justify-center py-6">
                      <div className="w-7 h-7 border-2 border-[rgba(255,255,255,0.1)] border-t-[#6366F1] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  ) : adminVideos.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-film text-[#6366F1] text-[1.2rem]"></i>
                      </div>
                      <p className="text-[0.82rem] text-[rgba(255,255,255,0.25)]">Aucune vidéo ajoutée</p>
                      <p className="text-[0.65rem] text-[rgba(255,255,255,0.15)] mt-1">Ajoutez votre première vidéo via le formulaire ci-dessus</p>
                    </div>
                  ) : (
                    <div className="max-h-[520px] overflow-y-auto pr-0.5 space-y-2.5 [scrollbar-width:thin]">
                      {adminVideos.map(v => {
                        const catBadge: Record<string, { bg: string; color: string; label: string }> = {
                          chinois: { bg: 'rgba(239,68,68,0.12)', color: '#F87171', label: 'Chinois' },
                          japonais: { bg: 'rgba(244,114,182,0.12)', color: '#F472B6', label: 'Japonais' },
                          indien: { bg: 'rgba(251,146,60,0.12)', color: '#FB923C', label: 'Indien' },
                          entreprise: { bg: 'rgba(99,102,241,0.12)', color: '#818CF8', label: 'Entreprise' },
                        };
                        const cat = catBadge[v.category] || catBadge.entreprise;
                        return (
                          <div key={v.id} className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
                            <div className="flex">
                              {/* Thumbnail */}
                              <div className="relative w-[110px] sm:w-[140px] shrink-0 bg-[#161719]">
                                <img
                                  src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                                  alt={v.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                                />
                                <div className="absolute bottom-1 right-1 bg-[rgba(0,0,0,0.75)] text-white text-[0.55rem] font-semibold px-1.5 py-0.5 rounded">
                                  {v.durationMin} min
                                </div>
                                {!v.active && (
                                  <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
                                    <span className="text-[0.55rem] text-[rgba(255,255,255,0.6)] font-bold uppercase">Inactive</span>
                                  </div>
                                )}
                              </div>
                              {/* Body */}
                              <div className="flex-1 min-w-0 p-2.5">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[0.78rem] font-bold text-[#EDEDEF] truncate">{esc(v.title)}</div>
                                    <div className="text-[0.62rem] text-[rgba(255,255,255,0.4)] truncate">
                                      <i className="fas fa-building text-[0.5rem] mr-0.5"></i>{esc(v.sponsor)}
                                    </div>
                                  </div>
                                  <span
                                    className="shrink-0 text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ background: cat.bg, color: cat.color }}
                                  >
                                    {cat.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[0.62rem] text-[#4ADE80] font-semibold">
                                    <i className="fas fa-money-bill-wave text-[0.5rem] mr-0.5"></i>${v.reward.toFixed(2)}
                                  </span>
                                  <span className="text-[0.55rem] text-[rgba(255,255,255,0.2)]">•</span>
                                  <span className="text-[0.55rem] text-[rgba(255,255,255,0.35)] font-mono truncate">{v.youtubeId}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleToggleVideoActive(v)}
                                    disabled={togglingVideoId === v.id}
                                    className={`flex-1 py-1.5 rounded-lg text-[0.6rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-50 ${
                                      v.active
                                        ? 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.2)]'
                                        : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)]'
                                    }`}
                                  >
                                    {togglingVideoId === v.id ? (
                                      <div className="w-3 h-3 border-[1.5px] border-current border-t-transparent rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                                    ) : (
                                      <>
                                        <i className={`fas ${v.active ? 'fa-toggle-on' : 'fa-toggle-off'} text-[0.65rem]`}></i>
                                        {v.active ? 'Actif' : 'Inactif'}
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => { setDeleteVideoId(v.id); setDeleteVideoTitle(v.title); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-[rgba(248,113,113,0.12)] text-[#F87171] text-[0.6rem] font-semibold border-none cursor-pointer transition-all hover:bg-[rgba(248,113,113,0.2)] flex items-center gap-1"
                                    title="Supprimer la vidéo"
                                  >
                                    <i className="fas fa-trash text-[0.55rem]"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      {/* Delete User Confirmation Modal */}
      {deleteUserId && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[7000] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setDeleteUserId(null); setDeleteUserName(''); }}
        >
          <div
            className="rounded-2xl p-7 w-[88%] max-w-[320px] text-center"
            style={{
              background: '#1A1B1E',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              animation: 'modalIn 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-[rgba(248,113,113,0.12)] flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-[#F87171] text-[1.3rem]"></i>
            </div>
            <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#EDEDEF]">Supprimer l&apos;utilisateur</h3>
            <p className="text-[0.82rem] mb-1 leading-relaxed text-[rgba(255,255,255,0.55)]">
              Voulez-vous vraiment supprimer
            </p>
            <p className="text-[0.95rem] font-bold text-[#F87171] mb-2">{deleteUserName} ?</p>
            <p className="text-[0.68rem] text-[rgba(255,255,255,0.35)] mb-5">
              Cette action est irréversible. Toutes les données seront perdues.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteUserId(null); setDeleteUserName(''); }}
                className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(deleteUserId)}
                disabled={deletingUser}
                className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{
                  background: 'rgba(248,113,113,0.2)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  color: '#F87171',
                }}
              >
                {deletingUser ? (
                  <div className="w-4 h-4 border-2 border-[rgba(248,113,113,0.3)] border-t-[#F87171] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <><i className="fas fa-trash text-[0.7rem]"></i> Supprimer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Video Confirmation Modal */}
      {deleteVideoId && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[7000] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setDeleteVideoId(null); setDeleteVideoTitle(''); }}
        >
          <div
            className="rounded-2xl p-7 w-[88%] max-w-[320px] text-center"
            style={{
              background: '#1A1B1E',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              animation: 'modalIn 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-[rgba(248,113,113,0.12)] flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trash text-[#F87171] text-[1.2rem]"></i>
            </div>
            <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#EDEDEF]">Supprimer la vidéo</h3>
            <p className="text-[0.82rem] mb-1 leading-relaxed text-[rgba(255,255,255,0.55)]">
              Voulez-vous vraiment supprimer
            </p>
            <p className="text-[0.92rem] font-bold text-[#F87171] mb-2 truncate px-2">{deleteVideoTitle} ?</p>
            <p className="text-[0.68rem] text-[rgba(255,255,255,0.35)] mb-5">
              Cette action est irréversible. La vidéo ne sera plus visible par les utilisateurs.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteVideoId(null); setDeleteVideoTitle(''); }}
                className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteVideo}
                disabled={deletingVideo}
                className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{
                  background: 'rgba(248,113,113,0.2)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  color: '#F87171',
                }}
              >
                {deletingVideo ? (
                  <div className="w-4 h-4 border-2 border-[rgba(248,113,113,0.3)] border-t-[#F87171] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <><i className="fas fa-trash text-[0.7rem]"></i> Supprimer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
