'use client';

import { useState, useEffect } from 'react';
import { useAppStore, authFetch } from '@/lib/store';

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const { user, setPage } = useAppStore();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  // Poll for unread count every 15 seconds
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!user || !active) return;
      try {
        const res = await authFetch('/api/notifications?unreadOnly=true');
        const data = await res.json();
        if (data.success && active) {
          setUnreadCount(data.unreadCount);
        }
      } catch { /* */ }
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  // Fetch all when dropdown opens
  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    const load = async () => {
      try {
        const res = await authFetch('/api/notifications');
        const data = await res.json();
        if (data.success && active) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch { /* */ }
    };
    load();
    return () => { active = false; };
  }, [open, user]);

  const markAllRead = async () => {
    try {
      await authFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* */ }
  };

  const handleNotifClick = async (notif: Notif) => {
    if (!notif.read) {
      try {
        await authFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* */ }
    }
    if (notif.link) {
      setPage(notif.link);
      setOpen(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit_approved': return 'fa-check-circle';
      case 'deposit_rejected': return 'fa-times-circle';
      case 'withdrawal_approved': return 'fa-check-circle';
      case 'withdrawal_executed': return 'fa-money-bill-wave';
      case 'withdrawal_rejected': return 'fa-times-circle';
      case 'new_message': return 'fa-comment-dots';
      case 'referral_new': return 'fa-user-plus';
      default: return 'fa-bell';
    }
  };

  const getColor = (type: string) => {
    if (type.includes('approved') || type.includes('executed')) return '#22C55E';
    if (type.includes('rejected')) return '#F87171';
    if (type.includes('message')) return '#3B82F6';
    if (type.includes('referral')) return '#F59E0B';
    return '#6B7280';
  };

  if (!user) return null;

  const btnClass = dark
    ? 'w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 relative'
    : 'w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.6)] backdrop-blur-sm text-[rgba(0,0,0,0.55)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 relative';

  return (
    <div className="relative">
      {/* Bell button */}
      <button onClick={() => setOpen(!open)} className={btnClass}>
        <i className="fas fa-bell" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#F87171] text-white text-[0.55rem] font-bold rounded-full flex items-center justify-center" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[4999]" onClick={() => setOpen(false)} />
          
          <div
            className="absolute right-0 top-11 w-[300px] max-h-[400px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] z-[5000] overflow-hidden"
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[rgba(0,0,0,0.06)]">
              <span className="text-[0.82rem] font-bold text-[#1F2937]">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[0.65rem] text-[#22C55E] font-semibold bg-transparent border-none cursor-pointer">
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[340px]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <i className="fas fa-bell-slash text-[1.5rem] text-[rgba(0,0,0,0.15)] mb-2"></i>
                  <p className="text-[0.75rem] text-[rgba(0,0,0,0.35)]">Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full text-left p-3 flex items-start gap-2.5 border-b border-[rgba(0,0,0,0.04)] cursor-pointer transition-colors hover:bg-[rgba(0,0,0,0.02)] bg-transparent border-x-0 border-t-0"
                    style={{ borderLeftWidth: n.read ? '0' : '3px', borderLeftColor: getColor(n.type) }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${getColor(n.type)}15` }}
                    >
                      <i className={`fas ${getIcon(n.type)} text-[0.7rem]`} style={{ color: getColor(n.type) }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.75rem] font-semibold text-[#1F2937] leading-tight">{n.title}</div>
                      <div className="text-[0.68rem] text-[rgba(0,0,0,0.5)] leading-snug mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[0.58rem] text-[rgba(0,0,0,0.3)] mt-1">
                        {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0 mt-2"></div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
